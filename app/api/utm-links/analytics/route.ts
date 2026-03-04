import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"
import { getCountryName, getCountryFlag } from "@/lib/countries"

// GET /api/utm-links/analytics — Click analytics for UTM links
export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("utmLinks", "read")
    if (!check.authorized) return check.response

    const { searchParams } = new URL(request.url)
    const linkId = searchParams.get("linkId")
    const period = parseInt(searchParams.get("period") || "30", 10)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - period)

    // Build where clause
    const where: Record<string, unknown> = {
      clickedAt: { gte: startDate },
    }
    if (linkId) where.linkId = linkId

    // Fetch all clicks in period
    const clicks = await prisma.linkClick.findMany({
      where,
      orderBy: { clickedAt: "desc" },
    })

    const totalClicks = clicks.length

    // === SUMMARY ===

    // Clicks by day (fill all days in period with 0)
    const clicksByDayMap = new Map<string, number>()
    const today = new Date()
    for (let i = 0; i < period; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateKey = date.toISOString().split("T")[0]
      clicksByDayMap.set(dateKey, 0)
    }
    for (const click of clicks) {
      const dateKey = new Date(click.clickedAt).toISOString().split("T")[0]
      if (clicksByDayMap.has(dateKey)) {
        clicksByDayMap.set(dateKey, clicksByDayMap.get(dateKey)! + 1)
      }
    }
    const clicksByDay = Array.from(clicksByDayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, clicks]) => ({ date, clicks }))

    // Country aggregation
    const countryMap = new Map<string, number>()
    for (const click of clicks) {
      const country = click.country || "Unknown"
      countryMap.set(country, (countryMap.get(country) || 0) + 1)
    }

    const uniqueCountries = countryMap.size
    const topCountryEntry = Array.from(countryMap.entries()).sort((a, b) => b[1] - a[1])[0]
    const topCountry = topCountryEntry?.[0] || null

    // Device aggregation
    const deviceMap = new Map<string, number>()
    for (const click of clicks) {
      const device = click.deviceType || "unknown"
      deviceMap.set(device, (deviceMap.get(device) || 0) + 1)
    }
    const topDeviceEntry = Array.from(deviceMap.entries()).sort((a, b) => b[1] - a[1])[0]
    const topDevice = topDeviceEntry?.[0] || null

    // Browser aggregation
    const browserMap = new Map<string, number>()
    for (const click of clicks) {
      const browser = click.browser || "Unknown"
      browserMap.set(browser, (browserMap.get(browser) || 0) + 1)
    }
    const topBrowserEntry = Array.from(browserMap.entries()).sort((a, b) => b[1] - a[1])[0]
    const topBrowser = topBrowserEntry?.[0] || null

    // OS aggregation
    const osMap = new Map<string, number>()
    for (const click of clicks) {
      const os = click.os || "Unknown"
      osMap.set(os, (osMap.get(os) || 0) + 1)
    }

    // Referrer aggregation
    const referrerMap = new Map<string, number>()
    for (const click of clicks) {
      const referrer = click.referrer || "Direct"
      referrerMap.set(referrer, (referrerMap.get(referrer) || 0) + 1)
    }

    // Hourly distribution (24 buckets)
    const hourlyBuckets = new Array(24).fill(0)
    for (const click of clicks) {
      const hour = new Date(click.clickedAt).getUTCHours()
      hourlyBuckets[hour]++
    }
    const hourly = hourlyBuckets.map((clicks, hour) => ({ hour, clicks }))

    // === GEOGRAPHY (with cities) ===
    const geographyMap = new Map<string, { clicks: number; cities: Map<string, number> }>()
    for (const click of clicks) {
      const country = click.country || "Unknown"
      if (!geographyMap.has(country)) {
        geographyMap.set(country, { clicks: 0, cities: new Map() })
      }
      const entry = geographyMap.get(country)!
      entry.clicks++
      if (click.city) {
        entry.cities.set(click.city, (entry.cities.get(click.city) || 0) + 1)
      }
    }
    const geography = Array.from(geographyMap.entries())
      .map(([country, data]) => ({
        country,
        countryName: getCountryName(country),
        flag: getCountryFlag(country),
        clicks: data.clicks,
        cities: Array.from(data.cities.entries())
          .map(([city, clicks]) => ({ city, clicks }))
          .sort((a, b) => b.clicks - a.clicks),
      }))
      .sort((a, b) => b.clicks - a.clicks)

    // === DEVICES ===
    const devices = Array.from(deviceMap.entries())
      .map(([deviceType, clicks]) => ({
        deviceType,
        clicks,
        percent: totalClicks > 0 ? Math.round((clicks / totalClicks) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)

    // === BROWSERS ===
    const browsers = Array.from(browserMap.entries())
      .map(([browser, clicks]) => ({ browser, clicks }))
      .sort((a, b) => b.clicks - a.clicks)

    // === OPERATING SYSTEMS ===
    const operatingSystems = Array.from(osMap.entries())
      .map(([os, clicks]) => ({ os, clicks }))
      .sort((a, b) => b.clicks - a.clicks)

    // === REFERRERS ===
    const referrers = Array.from(referrerMap.entries())
      .map(([referrer, clicks]) => ({ referrer, clicks }))
      .sort((a, b) => b.clicks - a.clicks)

    // === TOP LINKS ===
    const topLinksData = await prisma.utmLink.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        linkClicks: {
          where: { clickedAt: { gte: startDate } },
          select: {
            country: true,
            deviceType: true,
          },
        },
      },
      orderBy: { clickCount: "desc" },
    })

    const topLinks = topLinksData
      .map((link) => {
        const linkClicks = link.linkClicks.length

        // Top country for this link
        const linkCountryMap = new Map<string, number>()
        for (const c of link.linkClicks) {
          const country = c.country || "Unknown"
          linkCountryMap.set(country, (linkCountryMap.get(country) || 0) + 1)
        }
        const linkTopCountry = Array.from(linkCountryMap.entries())
          .sort((a, b) => b[1] - a[1])[0]?.[0] || null

        // Top device for this link
        const linkDeviceMap = new Map<string, number>()
        for (const c of link.linkClicks) {
          const device = c.deviceType || "unknown"
          linkDeviceMap.set(device, (linkDeviceMap.get(device) || 0) + 1)
        }
        const linkTopDevice = Array.from(linkDeviceMap.entries())
          .sort((a, b) => b[1] - a[1])[0]?.[0] || null

        return {
          id: link.id,
          name: link.name,
          slug: link.slug,
          clicks: linkClicks,
          topCountry: linkTopCountry,
          topDevice: linkTopDevice,
        }
      })
      .filter((link) => link.clicks > 0)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10)

    return NextResponse.json({
      summary: {
        totalClicks,
        uniqueCountries,
        topCountry,
        topDevice,
        topBrowser,
        clicksByDay,
      },
      geography,
      devices,
      browsers,
      operatingSystems,
      referrers,
      hourly,
      topLinks,
    })
  } catch (error) {
    console.error("Error fetching UTM link analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch click analytics" },
      { status: 500 }
    )
  }
}
