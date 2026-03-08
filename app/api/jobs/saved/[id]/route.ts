import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyPortalToken } from "@/lib/jobs-portal-auth"

// DELETE /api/jobs/saved/[id] — Unsave a job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = request.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const payload = await verifyPortalToken(token)
  if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

  try {
    await prisma.savedJob.deleteMany({
      where: { id, subscriberEmail: payload.email },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Saved Jobs] Delete error:", error)
    return NextResponse.json({ error: "Failed to unsave job" }, { status: 500 })
  }
}
