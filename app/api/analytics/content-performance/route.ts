import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"

// GET /api/analytics/content-performance - Get aggregated content analytics
export async function GET(request: NextRequest) {
  const check = await checkPermission("analytics", "read")
  if (!check.authorized) return check.response

  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get("platform")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const limit = parseInt(searchParams.get("limit") || "50", 10)

    // Build where clause from query params
    const where: Record<string, unknown> = {}

    if (platform) {
      where.platform = platform
    }

    if (startDate || endDate) {
      where.publishedAt = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      }
    }

    // Fetch content records, totals, groupBy in parallel
    const [content, aggregates, byPlatform, byContentType, topByROI, topByLeads] =
      await Promise.all([
        // Main content list ordered by views desc
        prisma.contentPerformance.findMany({
          where,
          orderBy: { views: "desc" },
          take: limit,
        }),

        // Aggregate totals
        prisma.contentPerformance.aggregate({
          where,
          _sum: {
            views: true,
            leadsGenerated: true,
            enrollments: true,
            revenue: true,
          },
          _avg: {
            engagementRate: true,
            conversionRate: true,
          },
        }),

        // Group by platform
        prisma.contentPerformance.groupBy({
          by: ["platform"],
          where,
          _count: { id: true },
          _sum: {
            views: true,
            leadsGenerated: true,
            revenue: true,
          },
          orderBy: { _sum: { views: "desc" } },
        }),

        // Group by contentType
        prisma.contentPerformance.groupBy({
          by: ["contentType"],
          where,
          _count: { id: true },
          _sum: {
            views: true,
            leadsGenerated: true,
            revenue: true,
          },
          orderBy: { _sum: { views: "desc" } },
        }),

        // Top 10 by ROI
        prisma.contentPerformance.findMany({
          where,
          orderBy: { roi: "desc" },
          take: 10,
        }),

        // Top 10 by leadsGenerated
        prisma.contentPerformance.findMany({
          where,
          orderBy: { leadsGenerated: "desc" },
          take: 10,
        }),
      ])

    // Build totals object with rounded financial values
    const totals = {
      totalViews: aggregates._sum.views ?? 0,
      totalLeads: aggregates._sum.leadsGenerated ?? 0,
      totalEnrollments: aggregates._sum.enrollments ?? 0,
      totalRevenue: Math.round(Number(aggregates._sum.revenue ?? 0) * 100) / 100,
      avgEngagementRate:
        Math.round(Number(aggregates._avg.engagementRate ?? 0) * 100) / 100,
      avgConversionRate:
        Math.round(Number(aggregates._avg.conversionRate ?? 0) * 100) / 100,
    }

    // Format byPlatform groupBy results
    const byPlatformFormatted = byPlatform.map((group) => ({
      platform: group.platform,
      count: group._count.id,
      views: group._sum.views ?? 0,
      leads: group._sum.leadsGenerated ?? 0,
      revenue: Math.round(Number(group._sum.revenue ?? 0) * 100) / 100,
    }))

    // Format byContentType groupBy results
    const byContentTypeFormatted = byContentType.map((group) => ({
      type: group.contentType,
      count: group._count.id,
      views: group._sum.views ?? 0,
      leads: group._sum.leadsGenerated ?? 0,
      revenue: Math.round(Number(group._sum.revenue ?? 0) * 100) / 100,
    }))

    return NextResponse.json({
      content,
      totals,
      byPlatform: byPlatformFormatted,
      byContentType: byContentTypeFormatted,
      topByROI,
      topByLeads,
    })
  } catch (error) {
    console.error("Error fetching content performance analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch content performance analytics" },
      { status: 500 }
    )
  }
}
