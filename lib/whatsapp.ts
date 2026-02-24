import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

// ─── Environment Guard ──────────────────────────────────────────────────────
// All functions return gracefully if WhatsApp env vars are not configured.

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const GRAPH_API_VERSION = "v19.0"

function isConfigured(): boolean {
  return !!(WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID)
}

// ─── Template Constants ─────────────────────────────────────────────────────

export const WHATSAPP_TEMPLATES = {
  LEAD_WELCOME: "lead_welcome",
  CLASS_REMINDER: "class_reminder",
  ABSENCE_FOLLOWUP: "absence_followup",
  PAYMENT_REMINDER: "payment_reminder",
  BATCH_ANNOUNCEMENT: "batch_announcement",
  MILESTONE_CELEBRATION: "milestone_celebration",
  RETENTION_OUTREACH: "retention_outreach",
} as const

// ─── Phone Normalization ────────────────────────────────────────────────────

export function normalizePhone(phone: string): string {
  // If phone starts with +, it already has a country code — just strip non-digits
  if (phone.trim().startsWith("+")) {
    return phone.replace(/\D/g, "")
  }

  // Strip all non-digits
  let cleaned = phone.replace(/\D/g, "")

  // Add 91 if bare 10-digit Indian number (no country code)
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned
  }

  // Ensure no double country code
  if (cleaned.startsWith("9191") && cleaned.length === 14) {
    cleaned = cleaned.substring(2)
  }

  return cleaned
}

// ─── Core Senders ───────────────────────────────────────────────────────────

interface SendResult {
  success: boolean
  messageId?: string
  reason?: string
}

/**
 * Send a pre-approved template message via WhatsApp Business API.
 */
export async function sendTemplate(
  to: string,
  templateName: string,
  params?: string[],
  options?: { leadId?: string; studentId?: string; metadata?: Record<string, unknown> }
): Promise<SendResult> {
  if (!isConfigured()) {
    return { success: false, reason: "not_configured" }
  }

  const phone = normalizePhone(to)

  const components: Record<string, unknown>[] = []
  if (params && params.length > 0) {
    components.push({
      type: "body",
      parameters: params.map((p) => ({ type: "text", text: p })),
    })
  }

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components: components.length > 0 ? components : undefined,
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMsg = data.error?.message || JSON.stringify(data)
      console.error(`WhatsApp template send failed:`, errorMsg)

      // Log failed message
      await logMessage({
        direction: "OUTBOUND",
        phoneNumber: phone,
        templateName,
        status: "FAILED",
        errorMessage: errorMsg,
        leadId: options?.leadId,
        studentId: options?.studentId,
        metadata: options?.metadata,
      })

      return { success: false, reason: errorMsg }
    }

    const messageId = data.messages?.[0]?.id
    console.log(`📱 WhatsApp template "${templateName}" sent to ${phone} (id: ${messageId})`)

    // Log successful message
    await logMessage({
      direction: "OUTBOUND",
      whatsappId: messageId,
      phoneNumber: phone,
      templateName,
      status: "SENT",
      leadId: options?.leadId,
      studentId: options?.studentId,
      metadata: options?.metadata,
    })

    return { success: true, messageId }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    console.error("WhatsApp send error:", errorMsg)
    return { success: false, reason: errorMsg }
  }
}

/**
 * Send a freeform text message via WhatsApp Business API.
 * Note: Only works within 24h of last customer message (session window).
 */
export async function sendText(
  to: string,
  text: string,
  options?: { leadId?: string; studentId?: string; metadata?: Record<string, unknown> }
): Promise<SendResult> {
  if (!isConfigured()) {
    return { success: false, reason: "not_configured" }
  }

  const phone = normalizePhone(to)

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: text },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMsg = data.error?.message || JSON.stringify(data)
      console.error(`WhatsApp text send failed:`, errorMsg)

      await logMessage({
        direction: "OUTBOUND",
        phoneNumber: phone,
        messageText: text,
        status: "FAILED",
        errorMessage: errorMsg,
        leadId: options?.leadId,
        studentId: options?.studentId,
        metadata: options?.metadata,
      })

      return { success: false, reason: errorMsg }
    }

    const messageId = data.messages?.[0]?.id
    console.log(`📱 WhatsApp text sent to ${phone} (id: ${messageId})`)

    await logMessage({
      direction: "OUTBOUND",
      whatsappId: messageId,
      phoneNumber: phone,
      messageText: text,
      status: "SENT",
      leadId: options?.leadId,
      studentId: options?.studentId,
      metadata: options?.metadata,
    })

    return { success: true, messageId }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    console.error("WhatsApp send error:", errorMsg)
    return { success: false, reason: errorMsg }
  }
}

// ─── Message Logging ────────────────────────────────────────────────────────

interface LogMessageParams {
  direction: string
  whatsappId?: string
  phoneNumber: string
  templateName?: string
  messageText?: string
  status: string
  errorMessage?: string
  leadId?: string
  studentId?: string
  metadata?: Record<string, unknown>
}

async function logMessage(params: LogMessageParams): Promise<void> {
  try {
    await prisma.whatsAppMessage.create({
      data: {
        direction: params.direction,
        whatsappId: params.whatsappId,
        phoneNumber: params.phoneNumber,
        templateName: params.templateName,
        messageText: params.messageText,
        status: params.status,
        errorMessage: params.errorMessage,
        leadId: params.leadId || null,
        studentId: params.studentId || null,
        metadata: (params.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    })
  } catch (error) {
    console.error("Failed to log WhatsApp message:", error)
  }
}

// ─── Status Update ──────────────────────────────────────────────────────────

export async function updateMessageStatus(
  whatsappId: string,
  status: string,
  timestamp?: number
): Promise<void> {
  try {
    await prisma.whatsAppMessage.update({
      where: { whatsappId },
      data: {
        status: status.toUpperCase(),
        statusTimestamp: timestamp ? new Date(timestamp * 1000) : new Date(),
      },
    })
  } catch (error) {
    // Message may not exist if it was sent before logging was implemented
    console.error(`Failed to update WhatsApp message status for ${whatsappId}:`, error)
  }
}
