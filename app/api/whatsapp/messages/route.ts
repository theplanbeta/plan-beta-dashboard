import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"

// GET /api/whatsapp/messages — List WhatsApp messages (filtered by lead/student)
export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("leads", "read")
    if (!check.authorized) return check.response

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get("leadId")
    const studentId = searchParams.get("studentId")
    const phoneNumber = searchParams.get("phoneNumber")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const offset = parseInt(searchParams.get("offset") || "0")

    const where: Record<string, unknown> = {}
    if (leadId) where.leadId = leadId
    if (studentId) where.studentId = studentId
    if (phoneNumber) where.phoneNumber = phoneNumber

    const [messages, total] = await Promise.all([
      prisma.whatsAppMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.whatsAppMessage.count({ where }),
    ])

    return NextResponse.json({ messages, total })
  } catch (error) {
    console.error("WhatsApp messages API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    )
  }
}
