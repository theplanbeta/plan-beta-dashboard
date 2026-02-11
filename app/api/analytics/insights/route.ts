import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { EXCHANGE_RATE } from "@/lib/pricing"

// Type definitions for Prisma query results
type PaymentRecord = {
  paymentDate: Date
  amount: number | { toNumber: () => number }
}

type StudentRecord = {
  enrollmentDate: Date
  status: string
  churnRisk: string
  attendanceRate: number | { toNumber: () => number }
  balance: number | { toNumber: () => number }
  originalPrice: number | { toNumber: () => number }
  completionStatus?: string
  updatedAt?: Date
  totalPaid?: number | { toNumber: () => number }
  payments?: PaymentRecord[]
  [key: string]: unknown
}

type AttendanceRecord = {
  date: Date
  status: string
}

type BatchRecord = {
  batchCode: string
  level: string
  status: string
  totalSeats: number
  enrolledCount: number
  _count?: { students: number }
  students?: Array<{ attendanceRate: number | { toNumber: () => number } }>
}

type RecommendationData = {
  totalRevenue?: number
  totalStudents?: number
  activeStudents?: number
  avgAttendance?: number
  avgAttendanceRate?: number
  churnRate?: number
  overdueRate?: number
  collectionEfficiency?: number
  capacityUtilization?: number
  bottomBatches?: Array<{ batchCode: string; avgAttendance?: number }>
  [key: string]: unknown
}

// GET /api/analytics/insights - Get advanced analytics and insights
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "30" // days

    const daysAgo = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysAgo)

    // Get all data for the period
    const [students, payments, attendance, referrals, batches, teacherHours, expenses] = await Promise.all([
      prisma.student.findMany({
        include: {
          payments: {
            where: {
              status: "COMPLETED",
              paymentDate: { gte: startDate },
            },
          },
          attendance: {
            where: {
              date: { gte: startDate },
            },
          },
          batch: true,
        },
      }),
      prisma.payment.findMany({
        where: {
          status: "COMPLETED",
          paymentDate: { gte: startDate },
        },
        include: { student: true },
      }),
      prisma.attendance.findMany({
        where: {
          date: { gte: startDate },
        },
        include: { student: true },
      }),
      prisma.referral.findMany({
        include: {
          referrer: true,
          referee: true,
        },
      }),
      prisma.batch.findMany({
        include: {
          students: true,
        },
      }),
      prisma.teacherHours.findMany({
        where: {
          date: { gte: startDate },
          status: "APPROVED", // Only count approved hours
        },
        select: {
          date: true,
          hoursWorked: true,
          totalAmount: true,
          paid: true,
          paidAmount: true,
        },
      }),
      prisma.expense.findMany({
        where: {
          OR: [
            { type: "ONE_TIME", date: { gte: startDate } },
            { type: "RECURRING", isActive: true },
          ],
        },
      }),
    ])

    // === REVENUE INSIGHTS ===
    // Separate EUR and INR payments, convert to EUR for unified calculations
    const eurPayments = payments.filter(p => p.currency === 'EUR')
    const inrPayments = payments.filter(p => p.currency === 'INR')

    const totalRevenueEur = eurPayments.reduce((sum, p) => sum + Number(p.amount), 0)
    const totalRevenueInr = inrPayments.reduce((sum, p) => sum + Number(p.amount), 0)
    const totalRevenueInrEurEquivalent = totalRevenueInr / EXCHANGE_RATE
    const totalRevenue = totalRevenueEur + totalRevenueInrEurEquivalent // Combined in EUR

    const revenueByDay = generateDailyRevenue(payments, daysAgo)
    const avgDailyRevenue = totalRevenue / daysAgo
    const projectedMonthlyRevenue = avgDailyRevenue * 30

    // Revenue by enrollment type - now using combo system, in EUR
    const revenueByType = students.reduce((acc, student) => {
      // Use totalPaidEur which already has currency conversion
      const studentRevenue = Number(student.totalPaidEur || 0)
      const enrollmentKey = student.isCombo ? 'COMBO' : student.currentLevel
      acc[enrollmentKey] = (acc[enrollmentKey] || 0) + studentRevenue
      return acc
    }, {} as Record<string, number>)

    // === COST INSIGHTS ===
    // Teacher costs are in INR, need to convert to EUR for profit calculations
    const totalTeacherCostsINR = teacherHours.reduce(
      (sum, h) => sum + Number(h.totalAmount),
      0
    )
    const totalTeacherCostsPaidINR = teacherHours
      .filter((h) => h.paid)
      .reduce((sum, h) => sum + Number(h.paidAmount || h.totalAmount), 0)
    const totalTeacherCostsUnpaidINR = totalTeacherCostsINR - totalTeacherCostsPaidINR

    // Convert INR to EUR for profitability calculations
    const totalTeacherCosts = totalTeacherCostsINR / EXCHANGE_RATE
    const totalTeacherCostsPaid = totalTeacherCostsPaidINR / EXCHANGE_RATE
    const totalTeacherCostsUnpaid = totalTeacherCostsUnpaidINR / EXCHANGE_RATE

    // Daily teacher costs for trend
    const teacherCostsByDay = generateDailyTeacherCosts(teacherHours, daysAgo)
    const avgDailyTeacherCosts = totalTeacherCosts / daysAgo

    // === OPERATING EXPENSES ===
    const toEur = (amount: number, currency: string) =>
      currency === "INR" ? amount / EXCHANGE_RATE : amount

    const recurringExpenses = expenses.filter(e => e.type === "RECURRING" && e.isActive)
    const oneTimeExpenses = expenses.filter(e => e.type === "ONE_TIME")

    const monthlyRecurringEur = recurringExpenses.reduce(
      (sum, e) => sum + toEur(Number(e.amount), e.currency), 0
    )
    const proratedRecurring = monthlyRecurringEur * (daysAgo / 30)
    const oneTimeTotal = oneTimeExpenses.reduce(
      (sum, e) => sum + toEur(Number(e.amount), e.currency), 0
    )
    const totalOperatingExpenses = proratedRecurring + oneTimeTotal
    const avgDailyOperatingExpenses = totalOperatingExpenses / daysAgo

    const expensesByCategory = [...recurringExpenses, ...oneTimeExpenses].reduce(
      (acc, e) => {
        const eurAmt = e.type === "RECURRING"
          ? toEur(Number(e.amount), e.currency) * (daysAgo / 30)
          : toEur(Number(e.amount), e.currency)
        acc[e.category] = (acc[e.category] || 0) + eurAmt
        return acc
      }, {} as Record<string, number>
    )

    // === PROFITABILITY ===
    const grossProfit = totalRevenue - totalTeacherCosts
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
    const projectedMonthlyTeacherCosts = avgDailyTeacherCosts * 30
    const projectedMonthlyProfit = projectedMonthlyRevenue - projectedMonthlyTeacherCosts

    // Net profit includes operating expenses
    const netProfit = totalRevenue - totalTeacherCosts - totalOperatingExpenses
    const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
    const projectedMonthlyOperatingExpenses = avgDailyOperatingExpenses * 30
    const projectedMonthlyNetProfit = projectedMonthlyRevenue - projectedMonthlyTeacherCosts - projectedMonthlyOperatingExpenses

    // === ROLLING P&L WINDOWS ===
    const rollingPnL = [30, 60, 90].map(windowDays => {
      const windowStart = new Date()
      windowStart.setDate(windowStart.getDate() - windowDays)

      const windowRevenue = payments
        .filter(p => new Date(p.paymentDate) >= windowStart)
        .reduce((sum, p) => sum + toEur(Number(p.amount), p.currency), 0)

      const windowTeacherCost = teacherHours
        .filter(h => new Date(h.date) >= windowStart)
        .reduce((sum, h) => sum + Number(h.totalAmount), 0) / EXCHANGE_RATE

      const windowOpEx = monthlyRecurringEur * (windowDays / 30) +
        oneTimeExpenses
          .filter(e => new Date(e.date) >= windowStart)
          .reduce((sum, e) => sum + toEur(Number(e.amount), e.currency), 0)

      const windowNetProfit = windowRevenue - windowTeacherCost - windowOpEx
      const windowMargin = windowRevenue > 0 ? (windowNetProfit / windowRevenue) * 100 : 0

      return {
        days: windowDays,
        revenue: Math.round(windowRevenue * 100) / 100,
        teacherCost: Math.round(windowTeacherCost * 100) / 100,
        operatingExpenses: Math.round(windowOpEx * 100) / 100,
        netProfit: Math.round(windowNetProfit * 100) / 100,
        margin: Math.round(windowMargin * 10) / 10,
      }
    })

    // === MONTHLY P&L BREAKDOWN ===
    const monthlyPnL = generateMonthlyPnL(payments, teacherHours, expenses, daysAgo)

    // === STUDENT LIFECYCLE INSIGHTS ===
    const avgStudentLifetime = calculateAvgLifetime(students as unknown as StudentRecord[])
    const avgStudentValue = calculateAvgStudentValue(students as unknown as StudentRecord[])
    const cohortRetention = calculateCohortRetention(students as unknown as StudentRecord[])

    // New enrollments trend
    const enrollmentsByDay = generateDailyEnrollments(students as unknown as StudentRecord[], daysAgo)
    const avgDailyEnrollments = students.filter(
      (s) => new Date(s.enrollmentDate) >= startDate
    ).length / daysAgo

    // === ATTENDANCE INSIGHTS ===
    const attendanceByDay = generateDailyAttendance(attendance, daysAgo)
    const avgAttendanceRate = students.reduce(
      (sum, s) => sum + Number(s.attendanceRate),
      0
    ) / students.length || 0

    // Attendance distribution
    const attendanceDistribution = {
      excellent: students.filter((s) => Number(s.attendanceRate) >= 90).length,
      good: students.filter(
        (s) => Number(s.attendanceRate) >= 75 && Number(s.attendanceRate) < 90
      ).length,
      average: students.filter(
        (s) => Number(s.attendanceRate) >= 50 && Number(s.attendanceRate) < 75
      ).length,
      poor: students.filter((s) => Number(s.attendanceRate) < 50).length,
    }

    // === CHURN INSIGHTS ===
    const churnRate = calculateChurnRate(students as unknown as StudentRecord[], daysAgo)
    const churnReasons = analyzeChurnReasons(students as unknown as StudentRecord[])
    const churnByLevel = students.reduce((acc, s) => {
      if (s.completionStatus === "DROPPED") {
        acc[s.currentLevel] = (acc[s.currentLevel] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    // === BATCH PERFORMANCE ===
    const batchPerformance = batches.map((batch) => {
      const avgAttendance = batch.students.reduce(
        (sum, s) => sum + Number(s.attendanceRate),
        0
      ) / batch.students.length || 0
      const revenue = batch.students.reduce(
        (sum, s) => sum + Number(s.finalPrice),
        0
      )
      // Convert teacher cost from INR to EUR before calculating profit
      const teacherCostEur = Number(batch.teacherCost) / EXCHANGE_RATE
      const profit = revenue - teacherCostEur

      return {
        batchCode: batch.batchCode,
        level: batch.level,
        enrolledCount: batch.students.length,
        fillRate: Number(batch.fillRate),
        avgAttendance,
        revenue,
        profit,
        profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
      }
    })

    // Top and bottom performing batches
    const topBatches = [...batchPerformance]
      .sort((a, b) => b.profitMargin - a.profitMargin)
      .slice(0, 3)
    const bottomBatches = [...batchPerformance]
      .sort((a, b) => a.avgAttendance - b.avgAttendance)
      .slice(0, 3)

    // === REFERRAL INSIGHTS ===
    const referralConversionRate = referrals.length > 0
      ? (referrals.filter((r) => r.month1Complete).length / referrals.length) * 100
      : 0

    const topReferrers = students
      .map((s) => ({
        id: s.id,
        name: s.name,
        referralCount: referrals.filter((r) => r.referrerId === s.id).length,
        successfulReferrals: referrals.filter(
          (r) => r.referrerId === s.id && r.month1Complete
        ).length,
      }))
      .filter((s) => s.referralCount > 0)
      .sort((a, b) => b.successfulReferrals - a.successfulReferrals)
      .slice(0, 5)

    // === PAYMENT INSIGHTS ===
    const paymentMethodDistribution = payments.reduce((acc, p) => {
      acc[p.method] = (acc[p.method] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const avgPaymentSize = totalRevenue / payments.length || 0
    // Calculate collection efficiency using EUR equivalents to avoid currency mismatch
    const collectionEfficiency = students.reduce(
      (sum, s) => {
        const paidEur = Number(s.totalPaidEur || 0)
        const totalEur = Number(s.eurEquivalent || s.finalPrice || 0)
        return sum + (totalEur > 0 ? (paidEur / totalEur) * 100 : 0)
      },
      0
    ) / students.length || 0

    // Outstanding balance analysis - convert to EUR for unified calculation
    const totalOutstanding = students.reduce(
      (sum, s) => {
        const balance = Number(s.balance)
        // Convert INR to EUR for consistent totals
        return sum + (s.currency === 'INR' ? balance / EXCHANGE_RATE : balance)
      },
      0
    )
    const overdueAmount = students
      .filter((s) => s.paymentStatus === "OVERDUE")
      .reduce((sum, s) => {
        const balance = Number(s.balance)
        return sum + (s.currency === 'INR' ? balance / EXCHANGE_RATE : balance)
      }, 0)

    // === KEY PERFORMANCE INDICATORS ===
    const kpis = {
      studentGrowthRate: calculateGrowthRate(
        students.filter((s) => new Date(s.enrollmentDate) >= startDate).length,
        students.filter((s) => s.completionStatus === "DROPPED").length
      ),
      revenueGrowthRate: calculateRevenueGrowth(payments, daysAgo),
      avgClassSize: batches.reduce(
        (sum, b) => sum + b.students.length,
        0
      ) / batches.length || 0,
      capacityUtilization: batches.reduce(
        (sum, b) => sum + Number(b.fillRate),
        0
      ) / batches.length || 0,
      customerSatisfaction: avgAttendanceRate, // Proxy metric
    }

    // === FORECASTS & PREDICTIONS ===
    const forecasts = {
      nextMonthRevenue: projectedMonthlyRevenue,
      nextMonthEnrollments: Math.round(avgDailyEnrollments * 30),
      expectedChurn: Math.round(students.length * (churnRate / 100)),
      projectedProfit: projectedMonthlyProfit,
      projectedTeacherCosts: projectedMonthlyTeacherCosts,
      projectedOperatingExpenses: projectedMonthlyOperatingExpenses,
      projectedNetProfit: projectedMonthlyNetProfit,
      projectedProfitMargin: projectedMonthlyRevenue > 0
        ? ((projectedMonthlyProfit / projectedMonthlyRevenue) * 100)
        : 0,
      projectedNetProfitMargin: projectedMonthlyRevenue > 0
        ? ((projectedMonthlyNetProfit / projectedMonthlyRevenue) * 100)
        : 0,
    }

    // === RECOMMENDATIONS ===
    const recommendations = generateRecommendations({
      churnRate,
      avgAttendanceRate,
      collectionEfficiency,
      capacityUtilization: kpis.capacityUtilization,
      bottomBatches,
    })

    return NextResponse.json({
      period: daysAgo,
      revenue: {
        total: totalRevenue, // Combined in EUR
        totalEur: totalRevenueEur,
        totalInr: totalRevenueInr,
        totalInrEurEquivalent: totalRevenueInrEurEquivalent,
        daily: revenueByDay,
        avgDaily: avgDailyRevenue,
        projected: projectedMonthlyRevenue,
        byType: revenueByType,
        outstanding: totalOutstanding,
        overdue: overdueAmount,
      },
      costs: {
        teachers: {
          total: totalTeacherCostsINR, // Display in INR
          totalEUR: totalTeacherCosts, // EUR for calculations
          paid: totalTeacherCostsPaidINR,
          paidEUR: totalTeacherCostsPaid,
          unpaid: totalTeacherCostsUnpaidINR,
          unpaidEUR: totalTeacherCostsUnpaid,
          daily: teacherCostsByDay,
          avgDaily: avgDailyTeacherCosts * EXCHANGE_RATE, // Convert back to INR for display
          avgDailyEUR: avgDailyTeacherCosts,
          projected: projectedMonthlyTeacherCosts * EXCHANGE_RATE, // Convert back to INR for display
          projectedEUR: projectedMonthlyTeacherCosts,
        },
        operatingExpenses: {
          total: totalOperatingExpenses,
          monthlyRecurring: monthlyRecurringEur,
          oneTime: oneTimeTotal,
          byCategory: expensesByCategory,
          avgDaily: avgDailyOperatingExpenses,
          projected: projectedMonthlyOperatingExpenses,
        },
        total: totalTeacherCosts + totalOperatingExpenses, // EUR value for profit calculations
      },
      profitability: {
        gross: grossProfit,
        margin: profitMargin,
        net: netProfit,
        netMargin: netProfitMargin,
        projected: projectedMonthlyProfit,
        projectedMargin: projectedMonthlyRevenue > 0
          ? ((projectedMonthlyProfit / projectedMonthlyRevenue) * 100)
          : 0,
        projectedNet: projectedMonthlyNetProfit,
        projectedNetMargin: projectedMonthlyRevenue > 0
          ? ((projectedMonthlyNetProfit / projectedMonthlyRevenue) * 100)
          : 0,
      },
      students: {
        total: students.length,
        active: students.filter((s) => s.completionStatus === "ACTIVE").length,
        enrollmentsByDay,
        avgDailyEnrollments,
        avgLifetime: avgStudentLifetime,
        avgValue: avgStudentValue,
        cohortRetention,
      },
      attendance: {
        avgRate: avgAttendanceRate,
        daily: attendanceByDay,
        distribution: attendanceDistribution,
      },
      churn: {
        rate: churnRate,
        reasons: churnReasons,
        byLevel: churnByLevel,
      },
      batches: {
        total: batches.length,
        performance: batchPerformance,
        topPerforming: topBatches,
        needsAttention: bottomBatches,
      },
      referrals: {
        conversionRate: referralConversionRate,
        topReferrers,
      },
      payments: {
        avgSize: avgPaymentSize,
        methodDistribution: paymentMethodDistribution,
        collectionEfficiency,
      },
      kpis,
      forecasts,
      recommendations,
      rollingPnL,
      monthlyPnL,
    })
  } catch (error) {
    console.error("Error fetching insights:", error)
    return NextResponse.json(
      { error: "Failed to fetch insights" },
      { status: 500 }
    )
  }
}

// Helper functions
function generateDailyRevenue(payments: Array<PaymentRecord & { currency?: string }>, days: number) {
  const dailyRevenue: Record<string, number> = {}
  const today = new Date()

  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split("T")[0]
    dailyRevenue[dateKey] = 0
  }

  payments.forEach((payment) => {
    const dateKey = new Date(payment.paymentDate).toISOString().split("T")[0]
    if (dailyRevenue[dateKey] !== undefined) {
      // Convert INR to EUR for unified daily revenue
      const amount = Number(payment.amount)
      const amountEur = payment.currency === 'INR' ? amount / EXCHANGE_RATE : amount
      dailyRevenue[dateKey] += amountEur
    }
  })

  return Object.entries(dailyRevenue)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }))
}

function generateDailyTeacherCosts(
  teacherHours: Array<{ date: Date; totalAmount: any }>,
  days: number
) {
  const dailyCosts: Record<string, number> = {}
  const today = new Date()

  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split("T")[0]
    dailyCosts[dateKey] = 0
  }

  teacherHours.forEach((entry) => {
    const dateKey = new Date(entry.date).toISOString().split("T")[0]
    if (dailyCosts[dateKey] !== undefined) {
      dailyCosts[dateKey] += Number(entry.totalAmount)
    }
  })

  return Object.entries(dailyCosts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cost]) => ({ date, cost }))
}

function generateDailyEnrollments(students: StudentRecord[], days: number) {
  const dailyEnrollments: Record<string, number> = {}
  const today = new Date()

  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split("T")[0]
    dailyEnrollments[dateKey] = 0
  }

  students.forEach((student) => {
    const dateKey = new Date(student.enrollmentDate).toISOString().split("T")[0]
    if (dailyEnrollments[dateKey] !== undefined) {
      dailyEnrollments[dateKey]++
    }
  })

  return Object.entries(dailyEnrollments)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

function generateDailyAttendance(attendance: AttendanceRecord[], days: number) {
  const dailyAttendance: Record<string, { present: number; total: number }> = {}
  const today = new Date()

  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split("T")[0]
    dailyAttendance[dateKey] = { present: 0, total: 0 }
  }

  attendance.forEach((record) => {
    const dateKey = new Date(record.date).toISOString().split("T")[0]
    if (dailyAttendance[dateKey]) {
      dailyAttendance[dateKey].total++
      if (record.status === "PRESENT" || record.status === "LATE") {
        dailyAttendance[dateKey].present++
      }
    }
  })

  return Object.entries(dailyAttendance)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      rate: data.total > 0 ? (data.present / data.total) * 100 : 0,
    }))
}

function calculateAvgLifetime(students: StudentRecord[]) {
  const completed = students.filter((s) => s.completionStatus === "COMPLETED")
  if (completed.length === 0) return 0

  const totalDays = completed.reduce((sum, s) => {
    const start = new Date(s.enrollmentDate).getTime()
    const end = s.updatedAt ? new Date(s.updatedAt).getTime() : Date.now()
    return sum + (end - start) / (1000 * 60 * 60 * 24)
  }, 0)

  return Math.round(totalDays / completed.length)
}

function calculateAvgStudentValue(students: StudentRecord[]) {
  if (students.length === 0) return 0
  const totalValue = students.reduce(
    (sum, s) => sum + Number(s.totalPaid),
    0
  )
  return totalValue / students.length
}

function calculateCohortRetention(students: StudentRecord[]) {
  const cohorts: Record<string, { enrolled: number; retained: number }> = {}

  students.forEach((s) => {
    const month = new Date(s.enrollmentDate).toISOString().slice(0, 7)
    if (!cohorts[month]) cohorts[month] = { enrolled: 0, retained: 0 }
    cohorts[month].enrolled++
    if (s.completionStatus === "ACTIVE" || s.completionStatus === "COMPLETED") {
      cohorts[month].retained++
    }
  })

  return Object.entries(cohorts).map(([month, data]) => ({
    month,
    retentionRate: (data.retained / data.enrolled) * 100,
  }))
}

function calculateChurnRate(students: StudentRecord[], days: number) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const churned = students.filter(
    (s) => s.completionStatus === "DROPPED" && s.updatedAt && new Date(s.updatedAt) >= startDate
  ).length

  const totalActive = students.filter((s) => s.completionStatus === "ACTIVE").length

  return totalActive > 0 ? (churned / totalActive) * 100 : 0
}

function analyzeChurnReasons(students: StudentRecord[]) {
  const dropped = students.filter((s) => s.completionStatus === "DROPPED")

  return {
    lowAttendance: dropped.filter((s) => Number(s.attendanceRate) < 50).length,
    paymentIssues: dropped.filter((s) => s.paymentStatus === "OVERDUE").length,
    other: dropped.filter(
      (s) => Number(s.attendanceRate) >= 50 && s.paymentStatus !== "OVERDUE"
    ).length,
  }
}

function calculateGrowthRate(newStudents: number, churned: number) {
  return newStudents - churned
}

function calculateRevenueGrowth(payments: PaymentRecord[], days: number) {
  const midpoint = Math.floor(days / 2)
  const midDate = new Date()
  midDate.setDate(midDate.getDate() - midpoint)

  const firstHalf = payments.filter(
    (p) => new Date(p.paymentDate) < midDate
  ).reduce((sum, p) => sum + Number(p.amount), 0)

  const secondHalf = payments.filter(
    (p) => new Date(p.paymentDate) >= midDate
  ).reduce((sum, p) => sum + Number(p.amount), 0)

  return firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0
}

function generateMonthlyPnL(
  payments: Array<PaymentRecord & { currency?: string }>,
  teacherHours: Array<{ date: Date; totalAmount: unknown }>,
  expenses: Array<{ type: string; isActive: boolean; amount: unknown; currency: string; date: Date; category: string }>,
  days: number
) {
  const toEur = (amount: number, currency: string) =>
    currency === "INR" ? amount / EXCHANGE_RATE : amount

  const months: Record<string, { revenue: number; teacherCosts: number; operatingExpenses: number }> = {}

  // Initialize months for the period
  const today = new Date()
  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const monthKey = d.toISOString().slice(0, 7)
    if (!months[monthKey]) {
      months[monthKey] = { revenue: 0, teacherCosts: 0, operatingExpenses: 0 }
    }
  }

  // Revenue by month
  payments.forEach((p) => {
    const monthKey = new Date(p.paymentDate).toISOString().slice(0, 7)
    if (months[monthKey] !== undefined) {
      months[monthKey].revenue += toEur(Number(p.amount), p.currency || "EUR")
    }
  })

  // Teacher costs by month (INR -> EUR)
  teacherHours.forEach((h) => {
    const monthKey = new Date(h.date).toISOString().slice(0, 7)
    if (months[monthKey] !== undefined) {
      months[monthKey].teacherCosts += Number(h.totalAmount) / EXCHANGE_RATE
    }
  })

  // Recurring expenses prorated per month
  const recurringMonthly = expenses
    .filter(e => e.type === "RECURRING" && e.isActive)
    .reduce((sum, e) => sum + toEur(Number(e.amount), e.currency), 0)

  // One-time expenses by month
  const oneTimeByMonth: Record<string, number> = {}
  expenses.filter(e => e.type === "ONE_TIME").forEach(e => {
    const monthKey = new Date(e.date).toISOString().slice(0, 7)
    oneTimeByMonth[monthKey] = (oneTimeByMonth[monthKey] || 0) + toEur(Number(e.amount), e.currency)
  })

  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => {
      const opEx = recurringMonthly + (oneTimeByMonth[month] || 0)
      const grossProfit = data.revenue - data.teacherCosts
      const netProfit = data.revenue - data.teacherCosts - opEx
      const margin = data.revenue > 0 ? (netProfit / data.revenue) * 100 : 0

      return {
        month,
        revenue: Math.round(data.revenue * 100) / 100,
        teacherCosts: Math.round(data.teacherCosts * 100) / 100,
        operatingExpenses: Math.round(opEx * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        margin: Math.round(margin * 10) / 10,
      }
    })
}

function generateRecommendations(data: RecommendationData) {
  const recommendations = []

  if (data.churnRate && data.churnRate > 10) {
    recommendations.push({
      type: "warning",
      title: "High Churn Rate Detected",
      message: `Churn rate is ${data.churnRate.toFixed(1)}%. Focus on student engagement and early intervention.`,
      action: "Review students with high churn risk and implement retention strategies.",
    })
  }

  if (data.avgAttendanceRate && data.avgAttendanceRate < 75) {
    recommendations.push({
      type: "warning",
      title: "Low Average Attendance",
      message: `Average attendance is ${data.avgAttendanceRate.toFixed(0)}%. Consider improving class engagement.`,
      action: "Implement attendance improvement initiatives and follow up with low-attendance students.",
    })
  }

  if (data.collectionEfficiency && data.collectionEfficiency < 70) {
    recommendations.push({
      type: "alert",
      title: "Payment Collection Needs Attention",
      message: `Collection efficiency is ${data.collectionEfficiency.toFixed(0)}%. Many students have pending balances.`,
      action: "Intensify payment reminder campaigns and offer flexible payment plans.",
    })
  }

  if (data.capacityUtilization && data.capacityUtilization < 60) {
    recommendations.push({
      type: "info",
      title: "Underutilized Batch Capacity",
      message: `Capacity utilization is ${data.capacityUtilization.toFixed(0)}%. Consider marketing or consolidating batches.`,
      action: "Launch targeted marketing campaigns or merge low-enrollment batches.",
    })
  }

  if (data.bottomBatches && data.bottomBatches.length > 0 && data.bottomBatches[0].avgAttendance && data.bottomBatches[0].avgAttendance < 60) {
    recommendations.push({
      type: "alert",
      title: "Batches Need Attention",
      message: `${data.bottomBatches.length} batches have low attendance. Review teaching quality and student engagement.`,
      action: `Focus on batches: ${data.bottomBatches?.map((b) => b.batchCode).join(", ")}`,
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: "success",
      title: "All Systems Performing Well",
      message: "No critical issues detected. Keep up the good work!",
      action: "Continue monitoring key metrics and maintain current strategies.",
    })
  }

  return recommendations
}
