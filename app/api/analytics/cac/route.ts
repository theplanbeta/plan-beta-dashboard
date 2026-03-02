import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"
import { EXCHANGE_RATE } from "@/lib/pricing"

// Platform mapping: AdSpend platform → Lead source
const PLATFORM_MAP: Record<string, string> = {
  META_ADS: "META_ADS",
  GOOGLE: "GOOGLE",
  INSTAGRAM: "INSTAGRAM",
}

const PLATFORMS = Object.keys(PLATFORM_MAP)

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

// GET /api/analytics/cac — Customer Acquisition Cost by platform
export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("analytics", "read")
    if (!check.authorized) return check.response

    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")
    const period = parseInt(searchParams.get("period") || "90")

    // Determine date range
    let startDate: Date
    let endDate: Date

    if (startDateParam) {
      startDate = new Date(startDateParam)
    } else {
      startDate = new Date()
      startDate.setDate(startDate.getDate() - period)
    }

    if (endDateParam) {
      endDate = new Date(endDateParam)
    } else {
      endDate = new Date()
    }

    // 1. Query AdSpend grouped by platform within date range
    const adSpendByPlatform = await prisma.adSpend.groupBy({
      by: ["platform", "currency"],
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        spend: true,
        impressions: true,
        clicks: true,
      },
    })

    // Aggregate spend per platform, converting INR to EUR
    const platformSpend: Record<string, { spendEur: number; impressions: number; clicks: number }> = {}
    for (const platform of PLATFORMS) {
      platformSpend[platform] = { spendEur: 0, impressions: 0, clicks: 0 }
    }

    for (const row of adSpendByPlatform) {
      const platform = row.platform
      if (!platformSpend[platform]) continue

      const rawSpend = Number(row._sum.spend) || 0
      const spendEur = row.currency === "INR" ? rawSpend / EXCHANGE_RATE : rawSpend

      platformSpend[platform].spendEur += spendEur
      platformSpend[platform].impressions += row._sum.impressions || 0
      platformSpend[platform].clicks += row._sum.clicks || 0
    }

    // 2. Query Lead counts grouped by source within same date range
    const leadsBySource = await prisma.lead.groupBy({
      by: ["source"],
      where: {
        firstContactDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: true,
    })

    const convertedLeadsBySource = await prisma.lead.groupBy({
      by: ["source"],
      where: {
        firstContactDate: {
          gte: startDate,
          lte: endDate,
        },
        converted: true,
      },
      _count: true,
    })

    // Build lead count maps
    const leadCountMap: Record<string, number> = {}
    const conversionCountMap: Record<string, number> = {}

    for (const row of leadsBySource) {
      leadCountMap[row.source] = row._count
    }
    for (const row of convertedLeadsBySource) {
      conversionCountMap[row.source] = row._count
    }

    // 3. Build per-platform metrics
    const byPlatform = PLATFORMS.map((platform) => {
      const leadSource = PLATFORM_MAP[platform]
      const spend = round2(platformSpend[platform].spendEur)
      const clicks = platformSpend[platform].clicks
      const leads = leadCountMap[leadSource] || 0
      const conversions = conversionCountMap[leadSource] || 0

      const conversionRate = leads > 0 ? round2((conversions / leads) * 100) : 0
      const cac = conversions > 0 ? round2(spend / conversions) : null
      const cpc = clicks > 0 ? round2(spend / clicks) : null
      const cpl = leads > 0 ? round2(spend / leads) : null

      return {
        platform,
        spend,
        leads,
        conversions,
        conversionRate,
        cac,
        cpc,
        cpl,
      }
    })

    // 4. Overall metrics
    const totalSpend = round2(byPlatform.reduce((sum, p) => sum + p.spend, 0))
    const totalLeads = byPlatform.reduce((sum, p) => sum + p.leads, 0)
    const totalConversions = byPlatform.reduce((sum, p) => sum + p.conversions, 0)
    const overallCAC = totalConversions > 0 ? round2(totalSpend / totalConversions) : null

    // 5. Fetch average LTV from students
    const ltvAggregate = await prisma.student.aggregate({
      where: { completionStatus: { in: ["ACTIVE", "COMPLETED"] } },
      _avg: { totalPaidEur: true },
    })

    const avgLTV = round2(Number(ltvAggregate._avg.totalPaidEur) || 0)
    const ltvCacRatio = overallCAC !== null && overallCAC > 0
      ? round2(avgLTV / overallCAC)
      : null

    return NextResponse.json({
      byPlatform,
      overall: {
        totalSpend,
        totalLeads,
        totalConversions,
        overallCAC,
        avgLTV,
        ltvCacRatio,
      },
    })
  } catch (error) {
    console.error("CAC analytics error:", error)
    return NextResponse.json(
      { error: "Failed to calculate CAC" },
      { status: 500 }
    )
  }
}
