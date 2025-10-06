import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
    const [students, payments, attendance, referrals, batches] = await Promise.all([
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
    ])

    // === REVENUE INSIGHTS ===
    const revenueByDay = generateDailyRevenue(payments, daysAgo)
    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0)
    const avgDailyRevenue = totalRevenue / daysAgo
    const projectedMonthlyRevenue = avgDailyRevenue * 30

    // Revenue by enrollment type
    const revenueByType = students.reduce((acc, student) => {
      const studentRevenue = student.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      )
      acc[student.enrollmentType] = (acc[student.enrollmentType] || 0) + studentRevenue
      return acc
    }, {} as Record<string, number>)

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
      const profit = revenue - Number(batch.teacherCost)

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
    const collectionEfficiency = students.reduce(
      (sum, s) => sum + (Number(s.totalPaid) / Number(s.finalPrice)) * 100,
      0
    ) / students.length || 0

    // Outstanding balance analysis
    const totalOutstanding = students.reduce(
      (sum, s) => sum + Number(s.balance),
      0
    )
    const overdueAmount = students
      .filter((s) => s.paymentStatus === "OVERDUE")
      .reduce((sum, s) => sum + Number(s.balance), 0)

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
      projectedProfit: projectedMonthlyRevenue * 0.4, // Assuming 40% margin
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
        total: totalRevenue,
        daily: revenueByDay,
        avgDaily: avgDailyRevenue,
        projected: projectedMonthlyRevenue,
        byType: revenueByType,
        outstanding: totalOutstanding,
        overdue: overdueAmount,
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
function generateDailyRevenue(payments: PaymentRecord[], days: number) {
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
      dailyRevenue[dateKey] += Number(payment.amount)
    }
  })

  return Object.entries(dailyRevenue)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }))
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
