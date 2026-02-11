import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"
import { EXCHANGE_RATE } from "@/lib/pricing"

// GET /api/analytics/batch-profitability - Batch-cohort profitability analysis
export async function GET() {
  try {
    const check = await checkPermission("insights", "read")
    if (!check.authorized) return check.response

    // Fetch batches with financial data
    const batches = await prisma.batch.findMany({
      where: { status: { in: ["RUNNING", "COMPLETED", "FULL"] } },
      include: {
        students: {
          include: {
            payments: {
              where: { status: "COMPLETED" },
              select: { amount: true, currency: true },
            },
          },
        },
        teacherHours: {
          where: { status: "APPROVED" },
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
      where: { type: "ONE_TIME" },
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

    let totalRevenue = 0
    let totalTeacherCost = 0
    let totalOperatingCost = 0

    const batchProfitability = batches.map((batch) => {
      // Revenue: sum of student payments converted to EUR
      const revenue = batch.students.reduce((sum, s) => {
        return sum + s.payments.reduce((pSum, p) => {
          return pSum + toEur(Number(p.amount), p.currency)
        }, 0)
      }, 0)

      // Teacher cost: sum of approved hours (INR -> EUR)
      const teacherCost = batch.teacherHours.reduce(
        (sum, h) => sum + Number(h.totalAmount), 0
      ) / EXCHANGE_RATE

      // Operating cost share based on batch duration
      const startDate = batch.startDate || batch.createdAt
      const endDate = batch.endDate || new Date()
      const durationDays = Math.max(1,
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Prorated recurring cost share
      const recurringShare = monthlyRecurringEur * (durationDays / 30) / activeBatchCount

      // One-time expenses during batch period, split across active batches
      const oneTimeShare = oneTimeExpenses
        .filter((e) => {
          const eDate = new Date(e.date)
          return eDate >= startDate && eDate <= endDate
        })
        .reduce((sum, e) => sum + toEur(Number(e.amount), e.currency), 0) / activeBatchCount

      const operatingCostShare = recurringShare + oneTimeShare
      const totalCost = teacherCost + operatingCostShare
      const profit = revenue - totalCost
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0
      const perStudentProfit = batch.students.length > 0
        ? profit / batch.students.length : 0

      totalRevenue += revenue
      totalTeacherCost += teacherCost
      totalOperatingCost += operatingCostShare

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
        revenue: Math.round(revenue * 100) / 100,
        teacherCost: Math.round(teacherCost * 100) / 100,
        operatingCostShare: Math.round(operatingCostShare * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        margin: Math.round(margin * 10) / 10,
        perStudentProfit: Math.round(perStudentProfit * 100) / 100,
      }
    })

    const totalProfit = totalRevenue - totalTeacherCost - totalOperatingCost
    const avgMargin = totalRevenue > 0
      ? (totalProfit / totalRevenue) * 100 : 0

    return NextResponse.json({
      batches: batchProfitability,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalTeacherCost: Math.round(totalTeacherCost * 100) / 100,
        totalOperatingCost: Math.round(totalOperatingCost * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        avgMargin: Math.round(avgMargin * 10) / 10,
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
