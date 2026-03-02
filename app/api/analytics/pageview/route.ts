import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST /api/analytics/pageview — Lightweight internal page view logging
// Used by TrackingProvider via sendBeacon. No auth required (first-party, no PII).
// Increments dailyRevenue-adjacent metrics in DailyMetrics for the current day.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path, deviceType, timestamp } = body

    if (!path || typeof path !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    // Log to server console for debugging/analysis
    console.log(`📊 PageView: ${path} | device=${deviceType || "unknown"} | ${timestamp || new Date().toISOString()}`)

    // Upsert today's DailyMetrics — increment a counter for tracking purposes
    // Since DailyMetrics doesn't have a pageViews column, we log to console
    // and return success. A future migration can add pageViews tracking.
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Ensure today's DailyMetrics row exists (for dashboard daily snapshots)
    await prisma.dailyMetrics.upsert({
      where: { date: today },
      create: { date: today },
      update: { updatedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch {
    // Silent fail — pageview logging is non-critical
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
