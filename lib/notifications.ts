import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

interface CreateNotificationParams {
  type: string
  title: string
  message: string
  metadata?: Record<string, unknown>
  userId?: string // null = visible to all FOUNDERs
}

/**
 * Create an in-app notification.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        type: params.type,
        title: params.title,
        message: params.message,
        metadata: (params.metadata as Prisma.InputJsonValue) ?? undefined,
        userId: params.userId || null,
      },
    })
  } catch (error) {
    console.error("Failed to create notification:", error)
  }
}

// Notification type constants
export const NOTIFICATION_TYPES = {
  NEW_LEAD: "NEW_LEAD",
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  RETENTION_ALERT: "RETENTION_ALERT",
  WHATSAPP_INBOUND: "WHATSAPP_INBOUND",
  REFERRAL_SIGNUP: "REFERRAL_SIGNUP",
  BATCH_FULL: "BATCH_FULL",
  MILESTONE: "MILESTONE",
} as const
