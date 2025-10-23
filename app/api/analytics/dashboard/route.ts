import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getEurEquivalent } from "@/lib/pricing"

// GET /api/analytics/dashboard - Get dashboard analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all students
    const students = await prisma.student.findMany({
      include: {
        payments: {
          where: {
            status: "COMPLETED",
          },
        },
        batch: true,
      },
    })

    // Get all batches
    const batches = await prisma.batch.findMany({
      include: {
        students: true,
      },
    })

    // Get all payments
    const payments = await prisma.payment.findMany({
      where: {
        status: "COMPLETED",
      },
    })

    // Get all referrals
    const referrals = await prisma.referral.findMany()

    // Calculate student metrics
    const totalStudents = students.length
    const activeStudents = students.filter(
      (s) => s.completionStatus === "ACTIVE"
    ).length
    const completedStudents = students.filter(
      (s) => s.completionStatus === "COMPLETED"
    ).length
    const droppedStudents = students.filter(
      (s) => s.completionStatus === "DROPPED"
    ).length

    // Calculate financial metrics from actual payments
    // Separate by currency to avoid mixing EUR and INR
    const eurPayments = payments.filter(p => p.currency === 'EUR')
    const inrPayments = payments.filter(p => p.currency === 'INR')

    const totalRevenueEur = eurPayments.reduce((sum, p) => sum + Number(p.amount), 0)
    const totalRevenueInr = inrPayments.reduce((sum, p) => sum + Number(p.amount), 0)

    // Convert INR to EUR and calculate combined total
    const totalRevenueInrEurEquivalent = getEurEquivalent(totalRevenueInr, 'INR')
    const totalRevenueCombined = totalRevenueEur + totalRevenueInrEurEquivalent

    // For backward compatibility, use combined total as default totalRevenue
    const totalRevenue = totalRevenueCombined

    const totalPending = students.reduce(
      (sum, s) => sum + Number(s.balance),
      0
    )
    const avgRevPerStudent = totalStudents > 0 ? totalRevenue / totalStudents : 0

    // Calculate batch metrics
    const totalBatches = batches.length
    const activeBatches = batches.filter(
      (b) => b.status === "RUNNING" || b.status === "FILLING"
    ).length
    // Calculate fill rate based on actual enrolled students vs total seats
    const avgFillRate =
      batches.length > 0
        ? batches.reduce((sum, b) => {
            const fillRate = b.totalSeats > 0 ? (b.students.length / b.totalSeats) * 100 : 0
            return sum + fillRate
          }, 0) / batches.length
        : 0
    const totalSeatsAvailable = batches.reduce((sum, b) => sum + b.totalSeats, 0)
    const totalSeatsOccupied = batches.reduce((sum, b) => sum + b.students.length, 0)

    // Calculate referral metrics
    const totalReferrals = referrals.length
    const completedReferrals = referrals.filter((r) => r.month1Complete).length
    const pendingPayouts = referrals.filter(
      (r) => r.payoutStatus === "PENDING" && r.month1Complete
    ).length
    const totalReferralPayouts = referrals
      .filter((r) => r.payoutStatus === "PAID")
      .reduce((sum, r) => sum + Number(r.payoutAmount), 0)

    // Calculate attendance metrics
    const avgAttendanceRate =
      students.length > 0
        ? students.reduce((sum, s) => sum + Number(s.attendanceRate), 0) / students.length
        : 0

    // Payment status breakdown
    const paymentBreakdown = {
      paid: students.filter((s) => s.paymentStatus === "PAID").length,
      partial: students.filter((s) => s.paymentStatus === "PARTIAL").length,
      pending: students.filter((s) => s.paymentStatus === "PENDING").length,
      overdue: students.filter((s) => s.paymentStatus === "OVERDUE").length,
    }

    // Enrollment type breakdown - now using combo system
    const enrollmentBreakdown = {
      COMBO: students.filter((s) => s.isCombo).length,
      SINGLE_LEVEL: students.filter((s) => !s.isCombo).length,
      NEW: students.filter((s) => !s.isCombo && s.currentLevel === "NEW").length,
      A1: students.filter((s) => !s.isCombo && s.currentLevel === "A1").length,
      A1_HYBRID: students.filter((s) => !s.isCombo && s.currentLevel === "A1_HYBRID").length,
      A1_HYBRID_MALAYALAM: students.filter((s) => !s.isCombo && s.currentLevel === "A1_HYBRID_MALAYALAM").length,
      A2: students.filter((s) => !s.isCombo && s.currentLevel === "A2").length,
      B1: students.filter((s) => !s.isCombo && s.currentLevel === "B1").length,
      B2: students.filter((s) => !s.isCombo && s.currentLevel === "B2").length,
      SPOKEN_GERMAN: students.filter((s) => !s.isCombo && s.currentLevel === "SPOKEN_GERMAN").length,
    }

    // Churn risk analysis
    const churnRisk = {
      low: students.filter((s) => s.churnRisk === "LOW").length,
      medium: students.filter((s) => s.churnRisk === "MEDIUM").length,
      high: students.filter((s) => s.churnRisk === "HIGH").length,
    }

    // Recent enrollments (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentEnrollments = students.filter(
      (s) => new Date(s.enrollmentDate) >= thirtyDaysAgo
    ).length

    // Recent revenue (last 30 days) - sum from actual payments made in last 30 days
    const recentEurPayments = eurPayments.filter(p => new Date(p.paymentDate) >= thirtyDaysAgo)
    const recentInrPayments = inrPayments.filter(p => new Date(p.paymentDate) >= thirtyDaysAgo)

    const recentRevenueEur = recentEurPayments.reduce((sum, p) => sum + Number(p.amount), 0)
    const recentRevenueInr = recentInrPayments.reduce((sum, p) => sum + Number(p.amount), 0)

    // Convert INR to EUR and calculate combined recent revenue
    const recentRevenueInrEurEquivalent = getEurEquivalent(recentRevenueInr, 'INR')
    const recentRevenueCombined = recentRevenueEur + recentRevenueInrEurEquivalent

    // For backward compatibility, use combined total as default recentRevenue
    const recentRevenue = recentRevenueCombined

    // Level distribution
    const levelDistribution = {
      NEW: students.filter((s) => s.currentLevel === "NEW").length,
      A1: students.filter((s) => s.currentLevel === "A1").length,
      A1_HYBRID: students.filter((s) => s.currentLevel === "A1_HYBRID").length,
      A1_HYBRID_MALAYALAM: students.filter((s) => s.currentLevel === "A1_HYBRID_MALAYALAM").length,
      A2: students.filter((s) => s.currentLevel === "A2").length,
      B1: students.filter((s) => s.currentLevel === "B1").length,
      B2: students.filter((s) => s.currentLevel === "B2").length,
      SPOKEN_GERMAN: students.filter((s) => s.currentLevel === "SPOKEN_GERMAN").length,
    }

    return NextResponse.json({
      students: {
        total: totalStudents,
        active: activeStudents,
        completed: completedStudents,
        dropped: droppedStudents,
        recentEnrollments,
        levelDistribution,
      },
      financial: {
        totalRevenue,
        totalRevenueEur,
        totalRevenueInr,
        totalRevenueInrEurEquivalent,
        totalRevenueCombined,
        totalPending,
        avgRevPerStudent,
        recentRevenue,
        recentRevenueEur,
        recentRevenueInr,
        recentRevenueInrEurEquivalent,
        recentRevenueCombined,
        paymentBreakdown,
        enrollmentBreakdown,
      },
      batches: {
        total: totalBatches,
        active: activeBatches,
        avgFillRate,
        totalSeatsAvailable,
        totalSeatsOccupied,
        utilizationRate: totalSeatsAvailable > 0
          ? (totalSeatsOccupied / totalSeatsAvailable) * 100
          : 0,
      },
      referrals: {
        total: totalReferrals,
        completed: completedReferrals,
        pendingPayouts,
        totalPayouts: totalReferralPayouts,
        conversionRate: totalReferrals > 0
          ? (completedReferrals / totalReferrals) * 100
          : 0,
      },
      attendance: {
        avgRate: avgAttendanceRate,
      },
      churnRisk,
    })
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}
