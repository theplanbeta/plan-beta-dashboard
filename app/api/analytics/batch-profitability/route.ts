import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"
import { EXCHANGE_RATE } from "@/lib/pricing"

// GET /api/analytics/batch-profitability - Batch-cohort profitability analysis
export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("insights", "read")
    if (!check.authorized) return check.response

    const { searchParams } = new URL(request.url)
    const periodDays = parseInt(searchParams.get("period") || "0")

    // Calculate date filter (0 = all time)
    const periodStart = periodDays > 0
      ? new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)
      : undefined

    // Build payment date filter
    const paymentDateFilter = periodStart
      ? { status: "COMPLETED" as const, paymentDate: { gte: periodStart } }
      : { status: "COMPLETED" as const }

    // Build teacher hours date filter
    const teacherHoursFilter = periodStart
      ? { status: "APPROVED" as const, date: { gte: periodStart } }
      : { status: "APPROVED" as const }

    // Fetch batches with financial data filtered by period
    const batches = await prisma.batch.findMany({
      where: { status: { in: ["RUNNING", "COMPLETED", "FULL"] } },
      include: {
        students: {
          include: {
            payments: {
              where: paymentDateFilter,
              select: { amount: true, currency: true },
            },
          },
        },
        teacherHours: {
          where: teacherHoursFilter,
          select: { totalAmount: true },
        },
        teacher: { select: { name: true } },
      },
      orderBy: { startDate: "desc" },
    })

    // Fetch expenses for operating cost calculation
    const recurringExpenses = await prisma.expense.findMany({
      where: { type: "RECURRING", isActive: true },
    })
    const oneTimeExpenses = await prisma.expense.findMany({
      where: periodStart
        ? { type: "ONE_TIME", date: { gte: periodStart } }
        : { type: "ONE_TIME" },
    })

    const toEur = (amount: number, currency: string) =>
      currency === "INR" ? amount / EXCHANGE_RATE : amount

    // Monthly recurring operating cost in EUR
    const monthlyRecurringEur = recurringExpenses.reduce(
      (sum, e) => sum + toEur(Number(e.amount), e.currency), 0
    )

    // Count active batches for cost allocation
    const activeBatchCount = batches.filter((b) =>
      ["RUNNING", "FILLING", "FULL"].includes(b.status)
    ).length || 1

    // For period-filtered view, use the period days for prorating
    // For all-time view, use actual batch duration
    const effectiveDays = periodDays || undefined

    let totalRevenue = 0
    let totalTeacherCost = 0
    let totalOperatingCost = 0

    const batchProfitability = batches.map((batch) => {
      // Revenue: sum of student payments converted to EUR (already filtered by period)
      const revenue = batch.students.reduce((sum, s) => {
        return sum + s.payments.reduce((pSum, p) => {
          return pSum + toEur(Number(p.amount), p.currency)
        }, 0)
      }, 0)

      // Teacher cost: sum of approved hours (INR -> EUR, already filtered by period)
      const teacherCost = batch.teacherHours.reduce(
        (sum, h) => sum + Number(h.totalAmount), 0
      ) / EXCHANGE_RATE

      // Operating cost share based on batch duration within the period
      const batchStart = batch.startDate || batch.createdAt
      const batchEnd = batch.endDate || new Date()

      // If period is set, clamp the duration to the period window
      const effectiveStart = periodStart && batchStart < periodStart ? periodStart : batchStart
      const effectiveEnd = batchEnd
      const durationDays = Math.max(1,
        (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Prorated recurring cost share
      const recurringShare = monthlyRecurringEur * (durationDays / 30) / activeBatchCount

      // One-time expenses during batch period (within the period window), split across active batches
      const oneTimeShare = oneTimeExpenses
        .filter((e) => {
          const eDate = new Date(e.date)
          return eDate >= effectiveStart && eDate <= effectiveEnd
        })
        .reduce((sum, e) => sum + toEur(Number(e.amount), e.currency), 0) / activeBatchCount

      const operatingCostShare = recurringShare + oneTimeShare

      // Round individual values first, then derive profit so displayed numbers are self-consistent
      const roundedRevenue = Math.round(revenue * 100) / 100
      const roundedTeacherCost = Math.round(teacherCost * 100) / 100
      const roundedOpEx = Math.round(operatingCostShare * 100) / 100
      const roundedProfit = Math.round((roundedRevenue - roundedTeacherCost - roundedOpEx) * 100) / 100
      const roundedMargin = roundedRevenue > 0 ? Math.round((roundedProfit / roundedRevenue) * 1000) / 10 : 0
      const roundedPerStudent = batch.students.length > 0
        ? Math.round((roundedProfit / batch.students.length) * 100) / 100 : 0

      totalRevenue += roundedRevenue
      totalTeacherCost += roundedTeacherCost
      totalOperatingCost += roundedOpEx

      return {
        batchId: batch.id,
        batchCode: batch.batchCode,
        level: batch.level,
        status: batch.status,
        teacherName: batch.teacher?.name || "Unassigned",
        studentCount: batch.students.length,
        totalSeats: batch.totalSeats,
        fillRate: batch.totalSeats > 0
          ? Math.round((batch.students.length / batch.totalSeats) * 100) : 0,
        durationDays: Math.round(durationDays),
        startDate: batch.startDate,
        endDate: batch.endDate,
        revenue: roundedRevenue,
        teacherCost: roundedTeacherCost,
        operatingCostShare: roundedOpEx,
        totalCost: Math.round((roundedTeacherCost + roundedOpEx) * 100) / 100,
        profit: roundedProfit,
        margin: roundedMargin,
        perStudentProfit: roundedPerStudent,
      }
    })

    // Derive totals from rounded per-batch values for consistency
    const roundedTotalRevenue = Math.round(totalRevenue * 100) / 100
    const roundedTotalTeacherCost = Math.round(totalTeacherCost * 100) / 100
    const roundedTotalOperatingCost = Math.round(totalOperatingCost * 100) / 100
    const roundedTotalProfit = Math.round((roundedTotalRevenue - roundedTotalTeacherCost - roundedTotalOperatingCost) * 100) / 100
    const avgMargin = roundedTotalRevenue > 0
      ? Math.round((roundedTotalProfit / roundedTotalRevenue) * 1000) / 10 : 0

    return NextResponse.json({
      batches: batchProfitability,
      summary: {
        totalRevenue: roundedTotalRevenue,
        totalTeacherCost: roundedTotalTeacherCost,
        totalOperatingCost: roundedTotalOperatingCost,
        totalProfit: roundedTotalProfit,
        avgMargin,
        monthlyRecurringExpenses: Math.round(monthlyRecurringEur * 100) / 100,
        activeBatchCount,
      },
    })
  } catch (error) {
    console.error("Error calculating batch profitability:", error)
    return NextResponse.json(
      { error: "Failed to calculate batch profitability" },
      { status: 500 }
    )
  }
}
