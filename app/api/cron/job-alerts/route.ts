import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyCronSecret } from "@/lib/api-permissions"
import { sendMultiChannelAlert } from "@/lib/job-alert-channels"

export const maxDuration = 60

// GET /api/cron/job-alerts — Send daily/saved-search job alerts via email + WhatsApp + push
// Runs at 8 AM UTC (9 AM CET) daily, after the 7 AM scrape completes
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    console.log("[Cron] Starting job alerts...")

    // 1. Process subscription-based daily alerts
    const subscribers = await prisma.jobSubscription.findMany({
      where: {
        status: "active",
        alertFrequency: "daily",
      },
    })

    let sent = 0
    let skipped = 0

    for (const subscriber of subscribers) {
      const since = subscriber.lastAlertSent || new Date(Date.now() - 24 * 60 * 60 * 1000)

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
        select: {
          title: true, company: true, location: true,
          salaryMin: true, salaryMax: true, germanLevel: true,
          applyUrl: true, slug: true,
        },
      })

      if (jobs.length === 0) {
        skipped++
        continue
      }

      const result = await sendMultiChannelAlert(
        {
          email: subscriber.email,
          name: subscriber.name || undefined,
          whatsapp: subscriber.whatsapp || undefined,
          whatsappAlerts: subscriber.whatsappAlerts,
          pushAlerts: subscriber.pushAlerts,
          pushEndpoint: subscriber.pushEndpoint,
        },
        jobs.map((j) => ({
          title: j.title,
          company: j.company,
          location: j.location || undefined,
          salaryMin: j.salaryMin ? Number(j.salaryMin) : undefined,
          salaryMax: j.salaryMax ? Number(j.salaryMax) : undefined,
          germanLevel: j.germanLevel || undefined,
          applyUrl: j.applyUrl || undefined,
          slug: j.slug,
        }))
      )

      if (result.email || result.whatsapp || result.push) {
        await prisma.jobSubscription.update({
          where: { id: subscriber.id },
          data: { lastAlertSent: new Date() },
        })
        sent++
      } else {
        console.error(`[Cron] All channels failed for ${subscriber.email}`)
        skipped++
      }
    }

    // 2. Process SavedSearch alerts
    let searchAlertsSent = 0
    const savedSearches = await prisma.savedSearch.findMany({
      where: { alertEnabled: true },
    })

    for (const search of savedSearches) {
      const since = search.lastAlertSent || new Date(Date.now() - 24 * 60 * 60 * 1000)
      const filters = search.filters as Record<string, unknown>

      const where: Record<string, unknown> = {
        active: true,
        createdAt: { gte: since },
        profession: { in: ["Student Jobs", "Hospitality"] },
      }

      if (Array.isArray(filters.germanLevels) && filters.germanLevels.length > 0) {
        where.germanLevel = { in: filters.germanLevels }
      }
      if (Array.isArray(filters.locations) && filters.locations.length > 0) {
        where.location = { in: filters.locations }
      }
      if (Array.isArray(filters.jobTypes) && filters.jobTypes.length > 0) {
        where.jobType = { in: filters.jobTypes }
      }
      if (filters.englishOk) {
        where.OR = [{ germanLevel: null }, { germanLevel: "None" }, { germanLevel: "A1" }]
      }
      if (typeof filters.salaryMin === "number") {
        where.salaryMin = { gte: filters.salaryMin }
      }

      const jobs = await prisma.jobPosting.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          title: true, company: true, location: true,
          salaryMin: true, salaryMax: true, germanLevel: true,
          applyUrl: true, slug: true,
        },
      })

      if (jobs.length === 0) continue

      // Find subscriber for this email
      const subscriber = await prisma.jobSubscription.findUnique({
        where: { email: search.subscriberEmail },
        select: {
          status: true, name: true, whatsapp: true,
          whatsappAlerts: true, pushAlerts: true, pushEndpoint: true,
        },
      })

      if (!subscriber || subscriber.status !== "active") continue

      const result = await sendMultiChannelAlert(
        {
          email: search.subscriberEmail,
          name: subscriber.name || undefined,
          whatsapp: subscriber.whatsapp || undefined,
          whatsappAlerts: subscriber.whatsappAlerts,
          pushAlerts: subscriber.pushAlerts,
          pushEndpoint: subscriber.pushEndpoint,
        },
        jobs.map((j) => ({
          title: j.title,
          company: j.company,
          location: j.location || undefined,
          salaryMin: j.salaryMin ? Number(j.salaryMin) : undefined,
          salaryMax: j.salaryMax ? Number(j.salaryMax) : undefined,
          germanLevel: j.germanLevel || undefined,
          applyUrl: j.applyUrl || undefined,
          slug: j.slug,
        })),
        "saved-search",
        search.name
      )

      if (result.email || result.whatsapp || result.push) {
        await prisma.savedSearch.update({
          where: { id: search.id },
          data: { lastAlertSent: new Date() },
        })
        searchAlertsSent++
      }
    }

    console.log(`[Cron] Job alerts complete: ${sent} sub alerts, ${searchAlertsSent} search alerts, ${skipped} skipped`)

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      searchAlertsSent,
      total: subscribers.length,
    })
  } catch (error) {
    console.error("[Cron] Job alerts error:", error)
    return NextResponse.json({ error: "Job alerts failed" }, { status: 500 })
  }
}
