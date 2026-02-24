import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/analytics/marketing - Get marketing analytics
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

    // Get all leads and students for the period
    const [allLeads, allStudents, recentLeads, recentStudents] = await Promise.all([
      // All leads
      prisma.lead.findMany({
        include: {
          convertedToStudent: true,
        },
      }),
      // All students
      prisma.student.findMany(),
      // Recent leads (within period)
      prisma.lead.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        include: {
          convertedToStudent: true,
        },
      }),
      // Recent students (enrolled within period)
      prisma.student.findMany({
        where: {
          enrollmentDate: { gte: startDate },
        },
      }),
    ])

    // === LEAD METRICS ===
    const totalLeads = allLeads.length
    const convertedLeads = allLeads.filter((l) => l.converted).length
    const overallConversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0

    // Recent period metrics
    const recentLeadsCount = recentLeads.length
    const recentConversions = recentLeads.filter((l) => l.converted).length
    const recentConversionRate = recentLeadsCount > 0 ? (recentConversions / recentLeadsCount) * 100 : 0

    // Lead status breakdown
    const leadsByStatus = {
      NEW: allLeads.filter((l) => l.status === "NEW").length,
      CONTACTED: allLeads.filter((l) => l.status === "CONTACTED").length,
      INTERESTED: allLeads.filter((l) => l.status === "INTERESTED").length,
      TRIAL_SCHEDULED: allLeads.filter((l) => l.status === "TRIAL_SCHEDULED").length,
      TRIAL_ATTENDED: allLeads.filter((l) => l.status === "TRIAL_ATTENDED").length,
      CONVERTED: allLeads.filter((l) => l.status === "CONVERTED").length,
      LOST: allLeads.filter((l) => l.status === "LOST").length,
    }

    // Lead quality breakdown
    const leadsByQuality = {
      HOT: allLeads.filter((l) => l.quality === "HOT").length,
      WARM: allLeads.filter((l) => l.quality === "WARM").length,
      COLD: allLeads.filter((l) => l.quality === "COLD").length,
    }

    // === SOURCE PERFORMANCE ===
    const sources = ["META_ADS", "INSTAGRAM", "GOOGLE", "ORGANIC", "REFERRAL", "OTHER"] as const

    // Leads by source
    const leadsBySource = sources.reduce((acc, source) => {
      const sourceLeads = allLeads.filter((l) => l.source === source)
      const sourceConversions = sourceLeads.filter((l) => l.converted).length
      const conversionRate = sourceLeads.length > 0 ? (sourceConversions / sourceLeads.length) * 100 : 0

      acc[source] = {
        total: sourceLeads.length,
        converted: sourceConversions,
        conversionRate,
        quality: {
          HOT: sourceLeads.filter((l) => l.quality === "HOT").length,
          WARM: sourceLeads.filter((l) => l.quality === "WARM").length,
          COLD: sourceLeads.filter((l) => l.quality === "COLD").length,
        },
      }
      return acc
    }, {} as Record<string, any>)

    // Students by source (actual enrollments)
    const studentsBySource = sources.reduce((acc, source) => {
      const sourceStudents = allStudents.filter((s) => s.referralSource === source)
      const recentSourceStudents = recentStudents.filter((s) => s.referralSource === source)

      acc[source] = {
        total: sourceStudents.length,
        recent: recentSourceStudents.length,
        revenue: sourceStudents.reduce((sum, s) => sum + Number(s.totalPaidEur), 0),
        avgValue: sourceStudents.length > 0
          ? sourceStudents.reduce((sum, s) => sum + Number(s.totalPaidEur), 0) / sourceStudents.length
          : 0,
      }
      return acc
    }, {} as Record<string, any>)

    // === TRIAL CONVERSION ===
    const trialScheduled = allLeads.filter((l) =>
      l.status === "TRIAL_SCHEDULED" ||
      l.status === "TRIAL_ATTENDED" ||
      l.trialScheduledDate
    ).length

    const trialAttended = allLeads.filter((l) =>
      l.status === "TRIAL_ATTENDED" ||
      l.trialAttendedDate
    ).length

    const trialConverted = allLeads.filter((l) =>
      (l.status === "TRIAL_ATTENDED" || l.trialAttendedDate) &&
      l.converted
    ).length

    const trialAttendanceRate = trialScheduled > 0 ? (trialAttended / trialScheduled) * 100 : 0
    const trialConversionRate = trialAttended > 0 ? (trialConverted / trialAttended) * 100 : 0

    // === TIME TO CONVERSION ===
    const convertedLeadsWithTime = allLeads.filter((l) =>
      l.converted && l.convertedDate && l.firstContactDate
    )

    const avgTimeToConversion = convertedLeadsWithTime.length > 0
      ? convertedLeadsWithTime.reduce((sum, l) => {
          const days = Math.floor(
            (new Date(l.convertedDate!).getTime() - new Date(l.firstContactDate).getTime()) /
            (1000 * 60 * 60 * 24)
          )
          return sum + days
        }, 0) / convertedLeadsWithTime.length
      : 0

    // === FUNNEL METRICS ===
    const funnelData = {
      leads: totalLeads,
      contacted: leadsByStatus.CONTACTED + leadsByStatus.INTERESTED + leadsByStatus.TRIAL_SCHEDULED + leadsByStatus.TRIAL_ATTENDED + leadsByStatus.CONVERTED,
      trialScheduled,
      trialAttended,
      converted: convertedLeads,
    }

    // Calculate funnel drop-off rates
    const funnelRates = {
      leadToContact: funnelData.leads > 0 ? (funnelData.contacted / funnelData.leads) * 100 : 0,
      contactToTrial: funnelData.contacted > 0 ? (funnelData.trialScheduled / funnelData.contacted) * 100 : 0,
      trialToAttendance: funnelData.trialScheduled > 0 ? (funnelData.trialAttended / funnelData.trialScheduled) * 100 : 0,
      attendanceToConversion: funnelData.trialAttended > 0 ? (funnelData.converted / funnelData.trialAttended) * 100 : 0,
      overallConversion: funnelData.leads > 0 ? (funnelData.converted / funnelData.leads) * 100 : 0,
    }

    // === LEVEL INTEREST ===
    const interestByLevel = {
      NEW: allLeads.filter((l) => l.interestedLevel === "NEW").length,
      A1: allLeads.filter((l) => l.interestedLevel === "A1").length,
      A1_HYBRID: allLeads.filter((l) => l.interestedLevel === "A1_HYBRID").length,
      A1_HYBRID_MALAYALAM: allLeads.filter((l) => l.interestedLevel === "A1_HYBRID_MALAYALAM").length,
      A2: allLeads.filter((l) => l.interestedLevel === "A2").length,
      B1: allLeads.filter((l) => l.interestedLevel === "B1").length,
      B2: allLeads.filter((l) => l.interestedLevel === "B2").length,
      SPOKEN_GERMAN: allLeads.filter((l) => l.interestedLevel === "SPOKEN_GERMAN").length,
      COMBO: allLeads.filter((l) => l.interestedCombo).length,
    }

    // === UTM CAMPAIGN PERFORMANCE ===
    const campaignMap = new Map<string, { total: number; converted: number }>()
    for (const lead of allLeads) {
      const campaign = lead.utmCampaign
      if (!campaign) continue
      const entry = campaignMap.get(campaign) || { total: 0, converted: 0 }
      entry.total++
      if (lead.converted) entry.converted++
      campaignMap.set(campaign, entry)
    }
    const campaignPerformance = Array.from(campaignMap.entries())
      .map(([campaign, data]) => ({
        campaign,
        leads: data.total,
        converted: data.converted,
        conversionRate: data.total > 0 ? (data.converted / data.total) * 100 : 0,
      }))
      .sort((a, b) => b.leads - a.leads)

    // === LANDING PAGE PERFORMANCE ===
    const landingPageMap = new Map<string, { total: number; converted: number }>()
    for (const lead of allLeads) {
      const page = lead.landingPage
      if (!page) continue
      const entry = landingPageMap.get(page) || { total: 0, converted: 0 }
      entry.total++
      if (lead.converted) entry.converted++
      landingPageMap.set(page, entry)
    }
    const landingPagePerformance = Array.from(landingPageMap.entries())
      .map(([page, data]) => ({
        page,
        leads: data.total,
        converted: data.converted,
        conversionRate: data.total > 0 ? (data.converted / data.total) * 100 : 0,
      }))
      .sort((a, b) => b.leads - a.leads)

    // === DEVICE BREAKDOWN ===
    const deviceMap = new Map<string, { total: number; converted: number }>()
    for (const lead of allLeads) {
      const device = lead.deviceType || "unknown"
      const entry = deviceMap.get(device) || { total: 0, converted: 0 }
      entry.total++
      if (lead.converted) entry.converted++
      deviceMap.set(device, entry)
    }
    const deviceBreakdown = Array.from(deviceMap.entries())
      .map(([device, data]) => ({
        device,
        leads: data.total,
        converted: data.converted,
        conversionRate: data.total > 0 ? (data.converted / data.total) * 100 : 0,
      }))
      .sort((a, b) => b.leads - a.leads)

    // === DAILY TRENDS ===
    const dailyLeads = generateDailyLeads(recentLeads, daysAgo)
    const dailyConversions = generateDailyConversions(recentLeads, daysAgo)

    // === KEY PERFORMANCE INDICATORS ===
    const kpis = {
      leadGrowth: recentLeadsCount,
      conversionRate: recentConversionRate,
      avgTimeToConversion: Math.round(avgTimeToConversion),
      trialAttendanceRate,
      trialConversionRate,
      topSource: Object.entries(leadsBySource)
        .sort(([, a]: any, [, b]: any) => b.conversionRate - a.conversionRate)
        [0]?.[0] || "N/A",
      bestPerformingSource: Object.entries(studentsBySource)
        .sort(([, a]: any, [, b]: any) => b.avgValue - a.avgValue)
        [0]?.[0] || "N/A",
    }

    // === RECOMMENDATIONS ===
    const recommendations = []

    // Low conversion rate warning
    if (recentConversionRate < 20 && recentLeadsCount > 10) {
      recommendations.push({
        type: "warning",
        title: "Low Conversion Rate",
        message: `Current conversion rate is ${recentConversionRate.toFixed(1)}%. Consider improving lead quality or follow-up process.`,
        action: "Review lead qualification criteria and sales process.",
      })
    }

    // Trial attendance issues
    if (trialAttendanceRate < 60 && trialScheduled > 5) {
      recommendations.push({
        type: "alert",
        title: "Low Trial Attendance",
        message: `Only ${trialAttendanceRate.toFixed(0)}% of scheduled trials are being attended.`,
        action: "Send reminder messages and confirm trial appointments 24hrs before.",
      })
    }

    // Identify underperforming sources
    const underperformingSources = Object.entries(leadsBySource)
      .filter(([source, data]: any) => data.total > 5 && data.conversionRate < 15)
      .map(([source]) => source)

    if (underperformingSources.length > 0) {
      recommendations.push({
        type: "info",
        title: "Underperforming Marketing Channels",
        message: `${underperformingSources.join(", ")} have low conversion rates.`,
        action: "Consider pausing or optimizing these channels. Focus budget on high-performing sources.",
      })
    }

    // Highlight top performing source
    const topSource = Object.entries(studentsBySource)
      .sort(([, a]: any, [, b]: any) => b.avgValue - a.avgValue)
      [0]

    if (topSource && topSource[1].total > 3) {
      recommendations.push({
        type: "success",
        title: "Top Performing Channel",
        message: `${topSource[0]} delivers highest value students (avg €${topSource[1].avgValue.toFixed(0)}).`,
        action: "Increase marketing investment in this channel for better ROI.",
      })
    }

    return NextResponse.json({
      period: daysAgo,
      overview: {
        totalLeads,
        convertedLeads,
        overallConversionRate,
        recentLeadsCount,
        recentConversions,
        recentConversionRate,
      },
      leads: {
        byStatus: leadsByStatus,
        byQuality: leadsByQuality,
        bySource: leadsBySource,
        daily: dailyLeads,
      },
      students: {
        bySource: studentsBySource,
        recentEnrollments: recentStudents.length,
      },
      trials: {
        scheduled: trialScheduled,
        attended: trialAttended,
        converted: trialConverted,
        attendanceRate: trialAttendanceRate,
        conversionRate: trialConversionRate,
      },
      funnel: {
        data: funnelData,
        rates: funnelRates,
      },
      interest: {
        byLevel: interestByLevel,
      },
      conversions: {
        total: convertedLeads,
        recent: recentConversions,
        daily: dailyConversions,
        avgTimeToConversion: Math.round(avgTimeToConversion),
      },
      attribution: {
        campaigns: campaignPerformance,
        landingPages: landingPagePerformance,
        devices: deviceBreakdown,
      },
      kpis,
      recommendations,
    })
  } catch (error) {
    console.error("Error fetching marketing analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch marketing analytics" },
      { status: 500 }
    )
  }
}

// Helper functions
function generateDailyLeads(leads: any[], days: number) {
  const dailyData: Record<string, number> = {}
  const today = new Date()

  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split("T")[0]
    dailyData[dateKey] = 0
  }

  leads.forEach((lead) => {
    const dateKey = new Date(lead.createdAt).toISOString().split("T")[0]
    if (dailyData[dateKey] !== undefined) {
      dailyData[dateKey]++
    }
  })

  return Object.entries(dailyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

function generateDailyConversions(leads: any[], days: number) {
  const dailyData: Record<string, number> = {}
  const today = new Date()

  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split("T")[0]
    dailyData[dateKey] = 0
  }

  leads.forEach((lead) => {
    if (lead.converted && lead.convertedDate) {
      const dateKey = new Date(lead.convertedDate).toISOString().split("T")[0]
      if (dailyData[dateKey] !== undefined) {
        dailyData[dateKey]++
      }
    }
  })

  return Object.entries(dailyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}
