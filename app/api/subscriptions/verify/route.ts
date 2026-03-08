import { NextRequest, NextResponse } from "next/server"
import { verifyPortalToken } from "@/lib/jobs-portal-auth"
import { prisma } from "@/lib/prisma"

// GET /api/subscriptions/verify — Verify premium portal token
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")

  if (!token) {
    return NextResponse.json({ isPremium: false }, { status: 200 })
  }

  const payload = await verifyPortalToken(token)
  if (!payload) {
    return NextResponse.json({ isPremium: false }, { status: 200 })
  }

  const subscription = await prisma.jobSubscription.findUnique({
    where: { email: payload.email },
    select: {
      email: true,
      name: true,
      status: true,
      tier: true,
      currentPeriodEnd: true,
      professions: true,
      germanLevels: true,
      locations: true,
      jobTypes: true,
      whatsappAlerts: true,
      pushAlerts: true,
    },
  })

  if (!subscription || subscription.status !== "active") {
    return NextResponse.json({ isPremium: false }, { status: 200 })
  }

  return NextResponse.json({
    isPremium: true,
    email: subscription.email,
    name: subscription.name,
    tier: subscription.tier,
    currentPeriodEnd: subscription.currentPeriodEnd,
    preferences: {
      professions: subscription.professions,
      germanLevels: subscription.germanLevels,
      locations: subscription.locations,
      jobTypes: subscription.jobTypes,
    },
    alerts: {
      whatsapp: subscription.whatsappAlerts,
      push: subscription.pushAlerts,
    },
  })
}
