// app/api/jobs-app/profile/cv-upload/route.ts
import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireJobSeeker } from "@/lib/jobs-app-auth"
import { validatePdf } from "@/lib/pdf-validation"
import { checkAllLayers, extractIp } from "@/lib/rate-limit-upstash"
import { put } from "@vercel/blob"
import { waitUntil } from "@vercel/functions"
import { signWorkerPayload } from "@/lib/worker-auth"

export const runtime = "nodejs"
export const maxDuration = 30 // upload-side only; worker has its own 60s
export const dynamic = "force-dynamic"

const MAX_BYTES = 10 * 1024 * 1024

export async function POST(request: Request) {
  let seeker
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  // Pre-reject by Content-Length before buffering body
  const clHeader = request.headers.get("content-length")
  if (clHeader) {
    const cl = parseInt(clHeader, 10)
    if (!Number.isNaN(cl) && cl > MAX_BYTES + 4096) {
      return NextResponse.json({ error: "PDF must be under 10 MB." }, { status: 413 })
    }
  }

  // Rate limit — fail fast before Claude call
  const rateResult = await checkAllLayers(seeker.id, extractIp(request))
  if (rateResult) {
    const status = rateResult.layer === "globalDaily" ? 503 : 429
    const message =
      rateResult.layer === "globalDaily"
        ? "We're processing a lot of CVs right now. Try again in a few minutes."
        : "You've uploaded too many CVs recently. Try again in an hour, or fill the form manually."
    return NextResponse.json({ error: message }, {
      status,
      headers: { "Retry-After": String(rateResult.retryAfterSeconds) },
    })
  }

  // Block concurrent upload per seeker (backed by DB partial unique index)
  const pending = await prisma.cVImport.findFirst({
    where: { seekerId: seeker.id, consumedAt: null, status: { not: "FAILED" } },
  })
  if (pending) {
    return NextResponse.json(
      { error: "You already have an upload in progress. Wait a moment or cancel the pending one.", importId: pending.id },
      { status: 409 }
    )
  }

  // Parse multipart
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const validation = await validatePdf(buffer, file.type)
  if (!validation.ok) {
    const status =
      validation.error.code === "size"
        ? 413
        : validation.error.code === "mime"
        ? 415
        : 422
    return NextResponse.json({ error: validation.error.message }, { status })
  }

  // Create CVImport row + write blob + fire worker
  let importRow
  try {
    importRow = await prisma.cVImport.create({
      data: {
        seekerId: seeker.id,
        status: "QUEUED",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      // Concurrent upload beat the findFirst check — return the existing pending
      const existing = await prisma.cVImport.findFirst({
        where: { seekerId: seeker.id, consumedAt: null, status: { not: "FAILED" } },
        select: { id: true, status: true },
        orderBy: { createdAt: "desc" },
      })
      return NextResponse.json(
        {
          error: "You already have an upload in progress",
          importId: existing?.id ?? null,
          status: existing?.status ?? "QUEUED",
        },
        { status: 409 }
      )
    }
    throw e
  }

  const blobKey = `cv-uploads/${seeker.id}/${importRow.id}.pdf`
  try {
    await put(blobKey, buffer, { access: "private", contentType: "application/pdf" })
  } catch (e) {
    await prisma.cVImport.update({
      where: { id: importRow.id },
      data: { status: "FAILED", error: `Blob write failed: ${(e as Error).message}` },
    })
    return NextResponse.json({ error: "Storage write failed. Try again." }, { status: 500 })
  }

  await prisma.cVImport.update({
    where: { id: importRow.id },
    data: { blobKey },
  })

  // Fire-and-forget worker call via Vercel's waitUntil — guarantees the
  // fetch completes even after this lambda has returned. Plain
  // `fetch(...).catch(...)` is unreliable on Vercel because the lambda can be
  // frozen mid-send. Also: use the request's own origin (same deployment) so
  // we don't accidentally route to theplanbeta.com via NEXT_PUBLIC_APP_URL.
  const baseUrl = new URL(request.url).origin
  const workerBody = JSON.stringify({ importId: importRow.id })
  const workerSignature = signWorkerPayload(workerBody)
  waitUntil(
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/jobs-app/profile/cv-upload/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Worker-Signature": workerSignature,
          },
          body: workerBody,
        })
        if (!res.ok) {
          console.error("worker returned non-OK", {
            importId: importRow.id,
            status: res.status,
            body: await res.text().catch(() => ""),
          })
        }
      } catch (err) {
        console.error("worker fire failed", { importId: importRow.id, err: (err as Error).message })
      }
    })()
  )

  return NextResponse.json({ importId: importRow.id }, { status: 202 })
}
