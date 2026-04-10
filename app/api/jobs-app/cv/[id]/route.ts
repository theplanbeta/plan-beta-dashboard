// app/api/jobs-app/cv/[id]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireJobSeeker } from "@/lib/jobs-app-auth"
import { del } from "@vercel/blob"

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

  // Delete from blob storage
  try {
    await del(cv.fileKey)
  } catch {
    // Non-fatal — file may already be gone
  }

  await prisma.generatedCV.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
