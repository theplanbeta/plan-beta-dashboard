import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { del } from "@vercel/blob"
import { checkPermission } from "@/lib/api-permissions"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkPermission("students", "update")
  if (!auth.authorized) return auth.response

  const { id } = await params

  try {
    const body = await request.json()
    const { status, moderationNote, title, company, location, description, germanLevel, jobType, contactInfo, salaryInfo } = body

    if (status && !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const session = await getServerSession(authOptions)

    const updateData: Record<string, unknown> = {}

    if (status) {
      updateData.status = status
      updateData.moderatedBy = session?.user?.email || "unknown"
      updateData.moderatedAt = new Date()
    }

    if (moderationNote !== undefined) updateData.moderationNote = moderationNote
    if (title !== undefined) updateData.title = title
    if (company !== undefined) updateData.company = company
    if (location !== undefined) updateData.location = location
    if (description !== undefined) updateData.description = description
    if (germanLevel !== undefined) updateData.germanLevel = germanLevel
    if (jobType !== undefined) updateData.jobType = jobType
    if (contactInfo !== undefined) updateData.contactInfo = contactInfo
    if (salaryInfo !== undefined) updateData.salaryInfo = salaryInfo

    const job = await prisma.communityJob.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(job)
  } catch (error) {
    console.error("[CommunityJob] Moderate failed:", error)
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkPermission("students", "delete")
  if (!auth.authorized) return auth.response

  const { id } = await params

  try {
    const job = await prisma.communityJob.findUnique({ where: { id } })
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // Delete image from Vercel Blob
    try {
      await del(job.imageUrl)
    } catch (error) {
      console.warn("[CommunityJob] Failed to delete blob:", error)
    }

    await prisma.communityJob.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[CommunityJob] Delete failed:", error)
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 })
  }
}

// Report a community job (public)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await prisma.communityJob.update({
      where: { id },
      data: { reportCount: { increment: 1 } },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to report job" }, { status: 500 })
  }
}
