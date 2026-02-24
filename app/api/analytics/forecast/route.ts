import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"
import { COURSE_PRICING } from "@/lib/pricing"

// GET /api/analytics/forecast — Revenue pipeline and 3-month forecast
export async function GET() {
  try {
    const check = await checkPermission("analytics", "read")
    if (!check.authorized) return check.response

    // 1. Pipeline value: interested/trial leads × conversion rate × avg course fee
    const [interestedLeads, historicalConversion, avgCourseFee] = await Promise.all([
      prisma.lead.count({
        where: { status: { in: ["INTERESTED", "TRIAL_SCHEDULED", "TRIAL_ATTENDED"] }, converted: false },
      }),
      // Historical conversion rate: converted / total leads from last 6 months
      (async () => {
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
        const [total, converted] = await Promise.all([
          prisma.lead.count({ where: { createdAt: { gte: sixMonthsAgo } } }),
          prisma.lead.count({ where: { createdAt: { gte: sixMonthsAgo }, converted: true } }),
        ])
        return total > 0 ? converted / total : 0.15 // Default 15% if no data
      })(),
      // Average course fee from existing students
      prisma.student.aggregate({
        where: { completionStatus: { in: ["ACTIVE", "COMPLETED"] } },
        _avg: { finalPrice: true },
      }),
    ])

    const avgFee = Number(avgCourseFee._avg.finalPrice) || 350

    const pipelineValue = interestedLeads * historicalConversion * avgFee

    // 2. Filling batch revenue
    const fillingBatches = await prisma.batch.findMany({
      where: { status: "FILLING" },
      select: {
        id: true,
        level: true,
        totalSeats: true,
        _count: { select: { students: { where: { completionStatus: { in: ["ACTIVE", "COMPLETED"] } } } } },
      },
    })

    let fillingRevenue = 0
    let fillingPotential = 0
    for (const batch of fillingBatches) {
      const levelKey = batch.level as keyof typeof COURSE_PRICING
      const pricing = COURSE_PRICING[levelKey]
      const price = pricing?.EUR || avgFee
      const enrolled = batch._count.students
      const available = Math.max(0, batch.totalSeats - enrolled)

      fillingRevenue += enrolled * price
      fillingPotential += available * price * 0.6 // 60% fill probability
    }

    // 3. Monthly revenue (last 6 months for trend)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    sixMonthsAgo.setDate(1)

    const recentPayments = await prisma.payment.findMany({
      where: {
        paymentDate: { gte: sixMonthsAgo },
        status: "COMPLETED",
      },
      select: { amount: true, paymentDate: true, currency: true },
    })

    // Group by month
    const monthlyRevenue: Record<string, number> = {}
    for (const payment of recentPayments) {
      const month = new Date(payment.paymentDate).toISOString().substring(0, 7)
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + Number(payment.amount)
    }

    // 3-month rolling average for forecast
    const months = Object.keys(monthlyRevenue).sort()
    const recentMonths = months.slice(-3)
    const avgMonthlyRevenue =
      recentMonths.length > 0
        ? recentMonths.reduce((sum, m) => sum + (monthlyRevenue[m] || 0), 0) / recentMonths.length
        : 0

    // Build forecast
    const forecast = []
    const now = new Date()
    for (let i = 1; i <= 3; i++) {
      const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const monthKey = forecastDate.toISOString().substring(0, 7)
      forecast.push({
        month: monthKey,
        projected: Math.round(avgMonthlyRevenue * (1 + 0.05 * i)), // 5% growth assumption
      })
    }

    return NextResponse.json({
      pipeline: {
        interestedLeads,
        conversionRate: Math.round(historicalConversion * 100),
        avgCourseFee: Math.round(avgFee),
        pipelineValue: Math.round(pipelineValue),
      },
      fillingBatches: {
        count: fillingBatches.length,
        enrolledRevenue: Math.round(fillingRevenue),
        potentialRevenue: Math.round(fillingPotential),
        totalExpected: Math.round(fillingRevenue + fillingPotential),
      },
      monthlyRevenue,
      forecast,
      avgMonthlyRevenue: Math.round(avgMonthlyRevenue),
    })
  } catch (error) {
    console.error("Forecast analytics error:", error)
    return NextResponse.json({ error: "Failed to generate forecast" }, { status: 500 })
  }
}
