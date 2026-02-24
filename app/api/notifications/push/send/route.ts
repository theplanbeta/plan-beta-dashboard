import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { sendTopicPush, sendBroadcastPush } from "@/lib/web-push"
import { z } from "zod"

const sendSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  url: z.string().optional(),
  topic: z.string().optional(), // If not provided, broadcasts to all
})

// POST /api/notifications/push/send — Send push notification (FOUNDER only)
export async function POST(request: NextRequest) {
  try {
    const check = await checkPermission("analytics", "create")
    if (!check.authorized) return check.response

    if (check.session?.user?.role !== "FOUNDER") {
      return NextResponse.json({ error: "FOUNDER access required" }, { status: 403 })
    }

    const body = await request.json()
    const validation = sendSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data
    const payload = { title: data.title, body: data.body, url: data.url }

    let result
    if (data.topic) {
      result = await sendTopicPush(data.topic, payload)
    } else {
      result = await sendBroadcastPush(payload)
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("Push send error:", error)
    return NextResponse.json(
      { error: "Failed to send push notification" },
      { status: 500 }
    )
  }
}
