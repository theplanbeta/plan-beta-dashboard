import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { sendTemplate, sendText } from "@/lib/whatsapp"
import { z } from "zod"

const sendSchema = z.object({
  to: z.string().min(1, "Phone number required"),
  template: z.string().optional(),
  text: z.string().optional(),
  params: z.array(z.string()).optional(),
  leadId: z.string().optional(),
  studentId: z.string().optional(),
}).refine(
  (data) => data.template || data.text,
  { message: "Either template or text is required" }
)

// POST /api/whatsapp/send — Send a WhatsApp message from the dashboard
export async function POST(request: NextRequest) {
  try {
    const check = await checkPermission("leads", "update")
    if (!check.authorized) return check.response

    const body = await request.json()
    const validation = sendSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data
    let result

    if (data.template) {
      result = await sendTemplate(data.to, data.template, data.params, {
        leadId: data.leadId,
        studentId: data.studentId,
      })
    } else {
      result = await sendText(data.to, data.text!, {
        leadId: data.leadId,
        studentId: data.studentId,
      })
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.reason || "Failed to send message" },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (error) {
    console.error("WhatsApp send API error:", error)
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    )
  }
}
