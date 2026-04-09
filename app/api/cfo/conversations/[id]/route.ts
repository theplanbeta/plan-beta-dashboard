import { NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkPermission("insights", "read")
  if (!auth.authorized) return auth.response

  try {
    const { id } = await params
    const userId = auth.session.user.id

    const conversation = await prisma.cfoConversation.findFirst({
      where: { id, userId },
    })

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    return NextResponse.json(conversation)
  } catch (error) {
    console.error("[CFO Conversation] Error:", error)
    return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkPermission("insights", "read")
  if (!auth.authorized) return auth.response

  try {
    const { id } = await params
    const userId = auth.session.user.id

    const result = await prisma.cfoConversation.deleteMany({
      where: { id, userId },
    })

    if (result.count === 0) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[CFO Conversation] Delete error:", error)
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 })
  }
}
