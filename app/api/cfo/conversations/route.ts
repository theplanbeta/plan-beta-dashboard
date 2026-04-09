import { NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const auth = await checkPermission("insights", "read")
  if (!auth.authorized) return auth.response

  try {
    const userId = auth.session.user.id
    const conversations = await prisma.cfoConversation.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    })

    return NextResponse.json(conversations)
  } catch (error) {
    console.error("[CFO Conversations] Error:", error)
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 })
  }
}
