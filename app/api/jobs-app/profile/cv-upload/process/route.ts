// app/api/jobs-app/profile/cv-upload/process/route.ts
import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { parseCVFromPdf } from "@/lib/cv-parser"
import { smartMerge, type ExistingProfile } from "@/lib/profile-merge"
import { head, del } from "@vercel/blob"
import { z } from "zod"
import { verifyWorkerSignature } from "@/lib/worker-auth"

export const runtime = "nodejs"
export const maxDuration = 60
// memory bump to 2048 MB is configured in vercel.json (functions block)

const bodySchema = z.object({ importId: z.string().min(1) })

function safeErrorMessage(err: unknown): string {
  // Zod schema rejection — the PDF parsed but the content hit a constraint
  // (length cap, injection marker, bad format). This is actionable info for
  // the user so surface a specific message instead of the generic fallback.
  if (
    err instanceof z.ZodError ||
    (err instanceof Error && err.name === "ZodError")
  ) {
    return "We couldn't read this CV cleanly. Please upload a standard PDF resume (not a scanned photo or heavily-formatted file)."
  }
  const msg = err instanceof Error ? err.message : String(err)
  if (/anthropic|api.?key|rate.?limit|overloaded/i.test(msg)) return "AI service temporarily unavailable — please retry in a minute"
  if (/blob|vercel/i.test(msg)) return "Storage temporarily unavailable"
  if (/prisma|postgres|p\d{4}/i.test(msg)) return "Database temporarily unavailable"
  if (/timeout|aborted|ECONNRESET/i.test(msg)) return "Parse took too long, please retry"
  if (/sanity check/i.test(msg)) return "CV parse produced unusual values — please try a different PDF"
  if (/invalid_json|JSON\.parse|unexpected token/i.test(msg)) return "AI returned malformed data — please retry"
  return "Parse failed, please try again"
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get("X-Worker-Signature") ?? ""
  if (!verifyWorkerSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }
  const { importId } = parsed.data

  const row = await prisma.cVImport.findUnique({
    where: { id: importId },
    include: { seeker: { include: { profile: true } } },
  })
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (row.status !== "QUEUED") {
    // Idempotent safety — worker may be called twice
    return NextResponse.json({ ok: true, status: row.status })
  }
  if (!row.blobKey) {
    await prisma.cVImport.update({
      where: { id: importId },
      data: { status: "FAILED", error: "Missing blobKey" },
    })
    return NextResponse.json({ ok: false })
  }

  await prisma.cVImport.update({
    where: { id: importId },
    data: { status: "PARSING", progress: "reading document…", startedAt: new Date() },
  })

  try {
    // Fetch PDF bytes from private blob — pass token explicitly for defence-in-depth
    const info = await head(row.blobKey, { token: process.env.BLOB_READ_WRITE_TOKEN })
    const pdfResponse = await fetch(info.url, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    })
    if (!pdfResponse.ok) throw new Error(`Blob fetch failed: ${pdfResponse.status}`)
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer())

    await prisma.cVImport.update({ where: { id: importId }, data: { progress: "extracting details…" } })

    // Parse via Claude Sonnet
    const { parsed: parsedCV } = await parseCVFromPdf(pdfBuffer)

    // Decide mode — empty profile → REVIEW, populated → MERGED.
    //
    // A profile is "truly empty" only if the user hasn't completed onboarding
    // AND has no manual edits AND has empty CV-relevant arrays. A fresh
    // graduate who finished onboarding (germanLevel, profession, etc.) has
    // empty workExperience but should NOT be treated as empty — REVIEW mode
    // overwrites the whole profile, wiping onboarding fields that aren't in
    // ParsedCV.
    const p = row.seeker.profile
    const onboardingComplete = row.seeker.onboardingComplete
    const workCount = ((p?.workExperience as unknown[] | null)?.length ?? 0)
    const techCount = ((p?.skills as { technical?: string[] } | null)?.technical?.length ?? 0)
    const manualEditCount = Object.keys((p?.manuallyEditedFields as Record<string, true> | null) ?? {}).length
    const profileEmpty =
      !p ||
      (!onboardingComplete &&
        manualEditCount === 0 &&
        workCount === 0 &&
        techCount === 0)

    let mergeDiff: unknown = null
    if (!profileEmpty && p) {
      const existing: ExistingProfile = {
        firstName: p.firstName ?? null,
        lastName: p.lastName ?? null,
        currentJobTitle: p.currentJobTitle ?? null,
        yearsOfExperience: p.yearsOfExperience ?? null,
        workExperience: (p.workExperience as ExistingProfile["workExperience"]) ?? [],
        skills: (p.skills as ExistingProfile["skills"]) ?? null,
        educationDetails: (p.educationDetails as ExistingProfile["educationDetails"]) ?? [],
        certifications: (p.certifications as ExistingProfile["certifications"]) ?? [],
        manuallyEditedFields: (p.manuallyEditedFields as Record<string, true> | null) ?? null,
      }
      const { diff } = smartMerge(existing, parsedCV)
      mergeDiff = diff
    }

    // Delete blob immediately — we don't persist uploaded PDFs
    try {
      await del(row.blobKey)
    } catch {
      // best-effort — cron will sweep
    }

    await prisma.cVImport.update({
      where: { id: importId },
      data: {
        status: "READY",
        mode: profileEmpty ? "REVIEW" : "MERGED",
        parsedData: parsedCV as unknown as Prisma.InputJsonValue,
        mergeDiff: mergeDiff as Prisma.InputJsonValue | undefined,
        blobKey: null,
        progress: null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    // Surface Zod issue details so we can diagnose schema rejections without
    // needing to tail Vercel logs every time.
    const zodIssues =
      err instanceof z.ZodError
        ? err.issues.map((i) => ({ path: i.path.join("."), code: i.code, message: i.message }))
        : null
    console.error("cv-upload parse failed", {
      importId,
      err: err instanceof Error ? err.message : String(err),
      zodIssues,
      stack: err instanceof Error ? err.stack : undefined,
    })
    // Persist the Zod issue summary to the row so /scripts/check-cv-imports.ts
    // can see it without Vercel log access.
    if (zodIssues && zodIssues.length > 0) {
      const summary = zodIssues
        .slice(0, 3)
        .map((i) => `${i.path || "root"}: ${i.code}`)
        .join("; ")
      // Don't persist the raw messages (they can include the rejected content)
      // but the path+code is enough to diagnose.
      await prisma.cVImport
        .update({ where: { id: importId }, data: { progress: `zod: ${summary}` } })
        .catch(() => {})
    }
    const userMessage = safeErrorMessage(err)
    // Best-effort blob cleanup on failure
    if (row.blobKey) {
      try { await del(row.blobKey) } catch (delErr) {
        console.warn("blob del on failure path failed", { blobKey: row.blobKey, err: delErr instanceof Error ? delErr.message : delErr })
      }
    }
    await prisma.cVImport.update({
      where: { id: importId },
      data: { status: "FAILED", error: userMessage, blobKey: null, progress: null },
    })
    return NextResponse.json({ ok: false, error: userMessage }, { status: 500 })
  }
}
