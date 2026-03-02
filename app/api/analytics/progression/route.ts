import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"

// The standard funnel levels in progression order
const FUNNEL_LEVELS = ["A1", "A2", "B1", "B2"] as const
const FUNNEL_TRANSITIONS: Array<{ from: string; to: string }> = [
  { from: "A1", to: "A2" },
  { from: "A2", to: "B1" },
  { from: "B1", to: "B2" },
]

// GET /api/analytics/progression — Student level progression analytics
export async function GET() {
  try {
    const check = await checkPermission("analytics", "read")
    if (!check.authorized) return check.response

    // 1. Get all upsell records grouped by fromLevel + toLevel transition
    const transitionGroups = await prisma.upsell.groupBy({
      by: ["fromLevel", "toLevel"],
      _count: true,
      _avg: { currentProgress: true },
    })

    // 2. Get converted counts and revenue per transition
    const convertedGroups = await prisma.upsell.groupBy({
      by: ["fromLevel", "toLevel"],
      where: { converted: true },
      _count: true,
      _sum: { additionalRevenue: true },
    })

    // 3. Get current student counts by level
    const studentsByLevel = await prisma.student.groupBy({
      by: ["currentLevel"],
      _count: true,
    })

    // Build a lookup for converted data
    const convertedLookup = new Map(
      convertedGroups.map((g) => [
        `${g.fromLevel}->${g.toLevel}`,
        {
          converted: g._count,
          revenue: Number(g._sum.additionalRevenue) || 0,
        },
      ])
    )

    // Build transitions array
    const transitions = transitionGroups.map((g) => {
      const key = `${g.fromLevel}->${g.toLevel}`
      const convertedData = convertedLookup.get(key) || { converted: 0, revenue: 0 }
      const conversionRate = g._count > 0
        ? Math.round((convertedData.converted / g._count) * 1000) / 10
        : 0

      return {
        from: g.fromLevel,
        to: g.toLevel,
        total: g._count,
        converted: convertedData.converted,
        conversionRate,
        revenue: Math.round(convertedData.revenue * 100) / 100,
        avgProgress: Math.round(Number(g._avg.currentProgress || 0) * 10) / 10,
      }
    })

    // Build student count lookup
    const studentCountByLevel = new Map(
      studentsByLevel.map((s) => [s.currentLevel, s._count])
    )

    // Build funnel: A1 -> A2 -> B1 -> B2
    const funnel = FUNNEL_LEVELS.map((level) => {
      const students = studentCountByLevel.get(level) || 0
      const transition = FUNNEL_TRANSITIONS.find((t) => t.from === level)

      let progressedToNext = 0
      if (transition) {
        const key = `${transition.from}->${transition.to}`
        const convertedData = convertedLookup.get(key)
        progressedToNext = convertedData?.converted || 0
      }

      const progressionRate = students > 0
        ? Math.round((progressedToNext / students) * 1000) / 10
        : 0

      return {
        level,
        students,
        progressedToNext,
        progressionRate,
      }
    })

    // Summary
    const totalUpsells = transitions.reduce((sum, t) => sum + t.total, 0)
    const totalConverted = transitions.reduce((sum, t) => sum + t.converted, 0)
    const totalRevenue = transitions.reduce((sum, t) => sum + t.revenue, 0)
    const overallConversionRate = totalUpsells > 0
      ? Math.round((totalConverted / totalUpsells) * 1000) / 10
      : 0

    return NextResponse.json({
      transitions,
      funnel,
      summary: {
        totalUpsells,
        totalConverted,
        overallConversionRate,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
      },
    })
  } catch (error) {
    console.error("Progression analytics error:", error)
    return NextResponse.json(
      { error: "Failed to calculate progression analytics" },
      { status: 500 }
    )
  }
}
