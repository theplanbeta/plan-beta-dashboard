// app/api/jobs-app/profile/cv-upload/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireJobSeeker } from "@/lib/jobs-app-auth"
import { validatePdf } from "@/lib/pdf-validation"
import { checkAllLayers, extractIp } from "@/lib/rate-limit-upstash"
import { put } from "@vercel/blob"

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
  const importRow = await prisma.cVImport.create({
    data: {
      seekerId: seeker.id,
      status: "QUEUED",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })

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

  // Fire-and-forget worker call — do NOT await
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
  fetch(`${baseUrl}/api/jobs-app/profile/cv-upload/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ importId: importRow.id }),
  }).catch(() => {
    // Worker should self-recover; a failed fire is logged but doesn't block response
  })

  return NextResponse.json({ importId: importRow.id }, { status: 202 })
}
