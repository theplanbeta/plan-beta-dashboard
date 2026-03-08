import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyCronSecret } from "@/lib/api-permissions"
import { sendJobAlertEmail } from "@/lib/job-alert-email"

export const maxDuration = 60

// GET /api/cron/job-alerts — Send daily job alert emails to active subscribers
// Runs at 8 AM UTC (9 AM CET) daily, after the 7 AM scrape completes
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    console.log("[Cron] Starting daily job alerts...")

    const subscribers = await prisma.jobSubscription.findMany({
      where: {
        status: "active",
        alertFrequency: "daily",
      },
    })

    if (subscribers.length === 0) {
      console.log("[Cron] No active daily subscribers")
      return NextResponse.json({ success: true, sent: 0, skipped: 0 })
    }

    let sent = 0
    let skipped = 0

    for (const subscriber of subscribers) {
      // Query new jobs since last alert
      const since = subscriber.lastAlertSent || new Date(Date.now() - 24 * 60 * 60 * 1000)

      // Build filters from subscriber preferences
      const where: Record<string, unknown> = {
        active: true,
        createdAt: { gte: since },
      }

      if (subscriber.professions.length > 0) {
        where.profession = { in: subscriber.professions }
      }
      if (subscriber.germanLevels.length > 0) {
        where.germanLevel = { in: subscriber.germanLevels }
      }
      if (subscriber.locations.length > 0) {
        where.location = { in: subscriber.locations }
      }
      if (subscriber.jobTypes.length > 0) {
        where.jobType = { in: subscriber.jobTypes }
      }

      const jobs = await prisma.jobPosting.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 20,
      })

      if (jobs.length === 0) {
        skipped++
        continue
      }

      const result = await sendJobAlertEmail({
        to: subscriber.email,
        name: subscriber.name || undefined,
        jobs: jobs.map((j) => ({
          title: j.title,
          company: j.company,
          location: j.location || undefined,
          salaryMin: j.salaryMin || undefined,
          salaryMax: j.salaryMax || undefined,
          germanLevel: j.germanLevel || undefined,
          applyUrl: j.applyUrl || undefined,
        })),
        portalEmail: subscriber.email,
      })

      if (result.success) {
        await prisma.jobSubscription.update({
          where: { id: subscriber.id },
          data: { lastAlertSent: new Date() },
        })
        sent++
      } else {
        console.error(`[Cron] Failed to send alert to ${subscriber.email}:`, result.error)
        skipped++
      }
    }

    console.log(`[Cron] Job alerts complete: ${sent} sent, ${skipped} skipped out of ${subscribers.length} subscribers`)

    return NextResponse.json({ success: true, sent, skipped, total: subscribers.length })
  } catch (error) {
    console.error("[Cron] Job alerts error:", error)
    return NextResponse.json({ error: "Job alerts failed" }, { status: 500 })
  }
}
