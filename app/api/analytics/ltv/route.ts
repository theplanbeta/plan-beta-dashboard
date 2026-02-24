import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"

// GET /api/analytics/ltv — Student Lifetime Value analytics
export async function GET() {
  try {
    const check = await checkPermission("analytics", "read")
    if (!check.authorized) return check.response

    // Overall average revenue per student
    const overallLTV = await prisma.student.aggregate({
      where: { completionStatus: { in: ["ACTIVE", "COMPLETED"] } },
      _avg: { totalPaid: true },
      _sum: { totalPaid: true },
      _count: true,
    })

    // Revenue by source
    const sourceBreakdown = await prisma.student.groupBy({
      by: ["referralSource"],
      where: { completionStatus: { in: ["ACTIVE", "COMPLETED"] } },
      _avg: { totalPaid: true },
      _sum: { totalPaid: true },
      _count: true,
    })

    // Revenue by level
    const levelBreakdown = await prisma.student.groupBy({
      by: ["currentLevel"],
      where: { completionStatus: { in: ["ACTIVE", "COMPLETED"] } },
      _avg: { totalPaid: true },
      _sum: { totalPaid: true },
      _count: true,
    })

    // Combo vs single-level LTV
    const comboLTV = await prisma.student.aggregate({
      where: {
        completionStatus: { in: ["ACTIVE", "COMPLETED"] },
        isCombo: true,
      },
      _avg: { totalPaid: true },
      _count: true,
    })

    const singleLTV = await prisma.student.aggregate({
      where: {
        completionStatus: { in: ["ACTIVE", "COMPLETED"] },
        isCombo: false,
      },
      _avg: { totalPaid: true },
      _count: true,
    })

    // Level progression rates (how many students move from one level to the next)
    const allStudents = await prisma.student.findMany({
      where: { completionStatus: { in: ["ACTIVE", "COMPLETED"] } },
      select: { currentLevel: true, isCombo: true, comboLevels: true },
    })

    const levelCounts: Record<string, number> = {}
    for (const student of allStudents) {
      const level = student.currentLevel
      levelCounts[level] = (levelCounts[level] || 0) + 1
    }

    return NextResponse.json({
      overall: {
        avgLTV: Number(overallLTV._avg.totalPaid) || 0,
        totalRevenue: Number(overallLTV._sum.totalPaid) || 0,
        totalStudents: overallLTV._count,
      },
      bySource: sourceBreakdown.map((s) => ({
        source: s.referralSource,
        avgLTV: Number(s._avg.totalPaid) || 0,
        totalRevenue: Number(s._sum.totalPaid) || 0,
        count: s._count,
      })),
      byLevel: levelBreakdown.map((l) => ({
        level: l.currentLevel,
        avgLTV: Number(l._avg.totalPaid) || 0,
        totalRevenue: Number(l._sum.totalPaid) || 0,
        count: l._count,
      })),
      comboVsSingle: {
        combo: {
          avgLTV: Number(comboLTV._avg.totalPaid) || 0,
          count: comboLTV._count,
        },
        single: {
          avgLTV: Number(singleLTV._avg.totalPaid) || 0,
          count: singleLTV._count,
        },
      },
      levelDistribution: levelCounts,
    })
  } catch (error) {
    console.error("LTV analytics error:", error)
    return NextResponse.json({ error: "Failed to calculate LTV" }, { status: 500 })
  }
}
