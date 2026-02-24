import { prisma } from "@/lib/prisma"

// ─── Environment Guard ──────────────────────────────────────────────────────
// Uses VAPID keys for Web Push — no Firebase dependency needed.
// All functions skip silently if not configured.

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = "mailto:hello@planbeta.in"

function isConfigured(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY)
}

interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
}

/**
 * Send a push notification to a single subscription.
 */
export async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<boolean> {
  if (!isConfigured()) return false

  try {
    // Dynamic import — web-push is an optional dependency
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const webPush = require("web-push") as {
      setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void
      sendNotification: (sub: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string) => Promise<void>
    }
    webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!)

    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url || "/site",
        icon: payload.icon || "/icon-192x192.png",
      })
    )
    return true
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number })?.statusCode
    // 410 Gone or 404 — subscription expired, deactivate it
    if (statusCode === 410 || statusCode === 404) {
      await prisma.pushSubscription.updateMany({
        where: { endpoint: subscription.endpoint },
        data: { active: false },
      })
    }
    console.error("Push notification failed:", error)
    return false
  }
}

/**
 * Send a push notification to all active subscribers of a given topic.
 */
export async function sendTopicPush(
  topic: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (!isConfigured()) return { sent: 0, failed: 0 }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      active: true,
      topics: { has: topic },
    },
  })

  let sent = 0
  let failed = 0

  for (const sub of subscriptions) {
    const success = await sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      payload
    )
    if (success) sent++
    else failed++
  }

  console.log(`📣 Push topic "${topic}": ${sent} sent, ${failed} failed`)
  return { sent, failed }
}

/**
 * Send a push notification to all active subscribers (broadcast).
 */
export async function sendBroadcastPush(
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (!isConfigured()) return { sent: 0, failed: 0 }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { active: true },
  })

  let sent = 0
  let failed = 0

  for (const sub of subscriptions) {
    const success = await sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      payload
    )
    if (success) sent++
    else failed++
  }

  return { sent, failed }
}
