import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { z } from "zod"

const limiter = rateLimit(RATE_LIMITS.MODERATE)

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  topics: z.array(z.string()).default([]),
  studentId: z.string().optional(),
  leadId: z.string().optional(),
})

// POST /api/notifications/push/subscribe — Store push subscription (public, rate-limited)
export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await limiter(request)
    if (rateLimitResult) return rateLimitResult

    const body = await request.json()
    const validation = subscribeSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    // Upsert — update if endpoint already exists, merge topics
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint: data.endpoint },
      select: { topics: true },
    })

    // Merge existing topics with new ones, deduplicate
    const mergedTopics = existing
      ? [...new Set([...existing.topics, ...data.topics])]
      : data.topics

    await prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: {
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        topics: data.topics,
        studentId: data.studentId,
        leadId: data.leadId,
        active: true,
      },
      update: {
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        topics: mergedTopics,
        active: true,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Push subscribe error:", error)
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    )
  }
}
