// app/api/jobs-app/cv/[id]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireJobSeeker } from "@/lib/jobs-app-auth"
import { deleteGeneratedDocument } from "@/lib/jobs-generated-document-storage"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let seeker
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const { id } = await params

  const cv = await prisma.generatedCV.findFirst({
    where: { id, seekerId: seeker.id },
  })

  if (!cv) {
    return NextResponse.json({ error: "CV not found" }, { status: 404 })
  }

  return NextResponse.json({ cv })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let seeker
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const { id } = await params

  const cv = await prisma.generatedCV.findFirst({
    where: { id, seekerId: seeker.id },
  })

  if (!cv) {
    return NextResponse.json({ error: "CV not found" }, { status: 404 })
  }

  // Delete from backing storage. This supports Vercel Blob in production
  // and the local .local/generated-documents fallback used in dev.
  try {
    await deleteGeneratedDocument(cv.fileKey || cv.fileUrl)
  } catch {
    // Non-fatal — file may already be gone
  }

  await prisma.generatedCV.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
