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
  const msg = err instanceof Error ? err.message : String(err)
  if (/anthropic|api.?key|rate.?limit/i.test(msg)) return "AI service temporarily unavailable"
  if (/blob|vercel/i.test(msg)) return "Storage temporarily unavailable"
  if (/prisma|postgres|p\d{4}/i.test(msg)) return "Database temporarily unavailable"
  if (/timeout|aborted/i.test(msg)) return "Parse took too long, please retry"
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

    // Decide mode — empty profile → REVIEW, populated → MERGED
    const p = row.seeker.profile
    const profileEmpty =
      !p ||
      (((p.workExperience as unknown[] | null)?.length ?? 0) === 0 &&
        (((p.skills as { technical?: string[] } | null)?.technical?.length ?? 0) === 0))

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
    console.error("cv-upload parse failed", {
      importId,
      err: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
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
