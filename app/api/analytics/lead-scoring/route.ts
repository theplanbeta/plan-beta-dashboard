import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"

const SCORE_RANGES = [
  { label: "0-20", min: 0, max: 20 },
  { label: "21-40", min: 21, max: 40 },
  { label: "41-60", min: 41, max: 60 },
  { label: "61-80", min: 61, max: 80 },
  { label: "81-100", min: 81, max: 100 },
] as const

const CONVERTED_STATUSES = ["CONVERTED", "ENROLLED"] as const

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)
}

// GET /api/analytics/lead-scoring - Analyze lead score effectiveness
export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("analytics", "read")
    if (!check.authorized) return check.response

    const leads = await prisma.lead.findMany({
      select: {
        leadScore: true,
        status: true,
        source: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // --- Group by score range ---
    const rangeMap = new Map<
      string,
      { leads: number; conversions: number; conversionDays: number[] }
    >()

    // Initialize all ranges including "Unscored"
    for (const range of SCORE_RANGES) {
      rangeMap.set(range.label, { leads: 0, conversions: 0, conversionDays: [] })
    }
    rangeMap.set("Unscored", { leads: 0, conversions: 0, conversionDays: [] })

    // --- Group by source ---
    const sourceMap = new Map<
      string,
      { leads: number; conversions: number; scoreSum: number; scoredCount: number }
    >()

    // --- Overall accumulators ---
    let totalLeads = leads.length
    let totalConversions = 0
    let scoreSum = 0
    let scoredCount = 0

    for (const lead of leads) {
      const isConverted = CONVERTED_STATUSES.includes(
        lead.status as (typeof CONVERTED_STATUSES)[number]
      )

      // Determine range key
      let rangeKey = "Unscored"
      if (lead.leadScore !== null) {
        scoredCount++
        scoreSum += lead.leadScore
        for (const range of SCORE_RANGES) {
          if (lead.leadScore >= range.min && lead.leadScore <= range.max) {
            rangeKey = range.label
            break
          }
        }
      }

      // Update range stats
      const rangeData = rangeMap.get(rangeKey)!
      rangeData.leads++
      if (isConverted) {
        rangeData.conversions++
        totalConversions++
        const days = daysBetween(lead.createdAt, lead.updatedAt)
        rangeData.conversionDays.push(days)
      }

      // Update source stats
      const source = lead.source || "OTHER"
      if (!sourceMap.has(source)) {
        sourceMap.set(source, { leads: 0, conversions: 0, scoreSum: 0, scoredCount: 0 })
      }
      const sourceData = sourceMap.get(source)!
      sourceData.leads++
      if (isConverted) {
        sourceData.conversions++
      }
      if (lead.leadScore !== null) {
        sourceData.scoreSum += lead.leadScore
        sourceData.scoredCount++
      }
    }

    // --- Build byRange response ---
    const byRange = Array.from(rangeMap.entries())
      .filter(([, data]) => data.leads > 0)
      .map(([range, data]) => {
        const conversionRate = data.leads > 0
          ? round2((data.conversions / data.leads) * 100)
          : 0
        const avgDaysToConvert = data.conversionDays.length > 0
          ? round2(
              data.conversionDays.reduce((sum, d) => sum + d, 0) /
                data.conversionDays.length
            )
          : null

        return {
          range,
          leads: data.leads,
          conversions: data.conversions,
          conversionRate,
          avgDaysToConvert,
        }
      })

    // Sort ranges so scored ranges appear in order, Unscored at the end
    const rangeOrder = [...SCORE_RANGES.map((r) => r.label), "Unscored"]
    byRange.sort(
      (a, b) => rangeOrder.indexOf(a.range) - rangeOrder.indexOf(b.range)
    )

    // --- Build bySource response ---
    const bySource = Array.from(sourceMap.entries())
      .map(([source, data]) => ({
        source,
        avgScore: data.scoredCount > 0 ? round2(data.scoreSum / data.scoredCount) : null,
        leads: data.leads,
        conversions: data.conversions,
        conversionRate: data.leads > 0
          ? round2((data.conversions / data.leads) * 100)
          : 0,
      }))
      .sort((a, b) => b.leads - a.leads)

    // --- Build overall response ---
    const overall = {
      totalLeads,
      totalConversions,
      overallConversionRate: totalLeads > 0
        ? round2((totalConversions / totalLeads) * 100)
        : 0,
      avgScore: scoredCount > 0 ? round2(scoreSum / scoredCount) : null,
      scoredLeadsPercent: totalLeads > 0
        ? round2((scoredCount / totalLeads) * 100)
        : 0,
    }

    return NextResponse.json({
      byRange,
      overall,
      bySource,
    })
  } catch (error) {
    console.error("Lead scoring analytics error:", error)
    return NextResponse.json(
      { error: "Failed to fetch lead scoring analytics" },
      { status: 500 }
    )
  }
}
