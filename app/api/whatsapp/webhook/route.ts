import { NextRequest, NextResponse } from "next/server"
import { createHmac } from "crypto"
import { updateMessageStatus } from "@/lib/whatsapp"
import { prisma } from "@/lib/prisma"
import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications"

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN
const APP_SECRET = process.env.WHATSAPP_APP_SECRET

// GET /api/whatsapp/webhook — Meta webhook verification (challenge/response)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === VERIFY_TOKEN && VERIFY_TOKEN) {
    console.log("WhatsApp webhook verified")
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 })
}

// POST /api/whatsapp/webhook — Receive status updates and incoming messages
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    // Verify HMAC signature from Meta (if app secret is configured)
    if (APP_SECRET) {
      const signature = request.headers.get("x-hub-signature-256")
      if (!signature) {
        return NextResponse.json({ error: "Missing signature" }, { status: 403 })
      }
      const expectedHash = createHmac("sha256", APP_SECRET)
        .update(rawBody)
        .digest("hex")
      if (signature !== `sha256=${expectedHash}`) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
      }
    }

    const body = JSON.parse(rawBody)

    // Process each entry from Meta
    const entries = body.entry || []
    for (const entry of entries) {
      const changes = entry.changes || []
      for (const change of changes) {
        if (change.field !== "messages") continue

        const value = change.value
        if (!value) continue

        // Handle delivery status updates
        const statuses = value.statuses || []
        for (const status of statuses) {
          await updateMessageStatus(
            status.id,
            status.status, // sent, delivered, read, failed
            status.timestamp ? parseInt(status.timestamp) : undefined
          )
        }

        // Handle incoming messages
        const messages = value.messages || []
        const contacts = value.contacts || []

        for (const message of messages) {
          const contact = contacts.find(
            (c: { wa_id: string }) => c.wa_id === message.from
          )
          const senderName = contact?.profile?.name || message.from
          const messageText =
            message.type === "text" ? message.text?.body : `[${message.type}]`

          // Log inbound message
          try {
            await prisma.whatsAppMessage.create({
              data: {
                direction: "INBOUND",
                whatsappId: message.id,
                phoneNumber: message.from,
                messageText: messageText || null,
                status: "RECEIVED",
                metadata: { senderName, type: message.type },
              },
            })
          } catch {
            // Duplicate whatsappId — skip
          }

          // Create notification for dashboard
          createNotification({
            type: NOTIFICATION_TYPES.WHATSAPP_INBOUND,
            title: `WhatsApp from ${senderName}`,
            message: messageText?.substring(0, 200) || "[Media message]",
            metadata: { phoneNumber: message.from, messageId: message.id },
          })
        }
      }
    }

    // Always return 200 to acknowledge receipt (Meta requirement)
    return NextResponse.json({ status: "ok" })
  } catch (error) {
    console.error("WhatsApp webhook error:", error)
    // Still return 200 — Meta will retry on non-200
    return NextResponse.json({ status: "ok" })
  }
}
