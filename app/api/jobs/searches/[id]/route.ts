import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { verifyPortalToken } from "@/lib/jobs-portal-auth"

// PUT /api/jobs/searches/[id] — Update a saved search
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = request.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const payload = await verifyPortalToken(token)
  if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

  let body: { name?: string; alertEnabled?: boolean; filters?: Prisma.InputJsonValue }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  try {
    const search = await prisma.savedSearch.updateMany({
      where: { id, subscriberEmail: payload.email },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.alertEnabled !== undefined ? { alertEnabled: body.alertEnabled } : {}),
        ...(body.filters !== undefined ? { filters: body.filters } : {}),
      },
    })

    if (search.count === 0) {
      return NextResponse.json({ error: "Search not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Saved Searches] Update error:", error)
    return NextResponse.json({ error: "Failed to update search" }, { status: 500 })
  }
}

// DELETE /api/jobs/searches/[id] — Delete a saved search
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
    await prisma.savedSearch.deleteMany({
      where: { id, subscriberEmail: payload.email },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Saved Searches] Delete error:", error)
    return NextResponse.json({ error: "Failed to delete search" }, { status: 500 })
  }
}
