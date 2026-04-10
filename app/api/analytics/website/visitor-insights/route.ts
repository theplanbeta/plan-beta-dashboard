import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"

const NIL_UUID = "00000000-0000-0000-0000-000000000000"

export async function GET(request: NextRequest) {
  const auth = await checkPermission("analytics", "read")
  if (!auth.authorized) return auth.response

  const userRole = auth.session.user.role

  const periodDays = parseInt(request.nextUrl.searchParams.get("period") || "30", 10)
  const now = new Date()
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Base filter: in period, not deleted, not conversion sentinel
  const baseWhere = {
    deletedAt: null,
    timestamp: { gte: periodStart },
    sessionId: { not: NIL_UUID },
  }

  const [
    totalPageViews,
    uniqueVisitorIds,
    sessionGroups,
    durationStats,
    dailyCounts,
    topPages,
    allVisitorIdsInPeriod,
    priorVisitorIds,
    convertedLeads,
  ] = await Promise.all([
    prisma.pageView.count({ where: baseWhere }),

    prisma.pageView.groupBy({
      by: ["visitorId"],
      where: baseWhere,
    }),

    prisma.pageView.groupBy({
      by: ["sessionId"],
      where: baseWhere,
      _count: true,
    }),

    prisma.pageView.aggregate({
      where: { ...baseWhere, duration: { not: null } },
      _avg: { duration: true },
      _count: { duration: true },
    }),

    prisma.pageView.groupBy({
      by: ["timestamp"],
      where: {
        deletedAt: null,
        timestamp: { gte: sevenDaysAgo },
        sessionId: { not: NIL_UUID },
      },
      _count: true,
    }),

    prisma.pageView.groupBy({
      by: ["path"],
      where: {
        ...baseWhere,
        path: { not: "/__conversion/lead" },
      },
      _count: true,
      _avg: { duration: true, scrollDepth: true },
      orderBy: { _count: { path: "desc" } },
      take: 10,
    }),

    prisma.pageView.groupBy({
      by: ["visitorId"],
      where: baseWhere,
    }),

    prisma.pageView.groupBy({
      by: ["visitorId"],
      where: {
        deletedAt: null,
        timestamp: { lt: periodStart },
        sessionId: { not: NIL_UUID },
      },
    }),

    prisma.lead.findMany({
      where: {
        visitorId: { not: null },
        createdAt: { gte: periodStart },
      },
      select: {
        id: true,
        name: true,
        source: true,
        visitorId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ])

  // Compute KPIs
  const uniqueVisitors = uniqueVisitorIds.length
  const avgPagesPerSession = sessionGroups.length > 0
    ? Math.round((totalPageViews / sessionGroups.length) * 10) / 10
    : 0
  const durationSampleSize = durationStats._count.duration
  const avgDurationPerPage = durationSampleSize >= 10
    ? Math.round(durationStats._avg.duration || 0)
    : null

  // Daily pageview trend (aggregate by date)
  const dailyMap = new Map<string, number>()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    dailyMap.set(d.toISOString().split("T")[0], 0)
  }
  for (const row of dailyCounts) {
    const dateKey = new Date(row.timestamp).toISOString().split("T")[0]
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + row._count)
  }
  const dailyPageViews = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }))

  // Funnel
  const allVisitorSet = new Set(allVisitorIdsInPeriod.map((v) => v.visitorId))
  const priorVisitorSet = new Set(priorVisitorIds.map((v) => v.visitorId))
  const returningVisitors = [...allVisitorSet].filter((id) => priorVisitorSet.has(id)).length
  const convertedVisitorIds = new Set(convertedLeads.map((l) => l.visitorId).filter(Boolean))
  const convertedVisitors = [...allVisitorSet].filter((id) => convertedVisitorIds.has(id)).length

  const funnel = {
    totalVisitors: allVisitorSet.size,
    returningVisitors,
    convertedVisitors,
    visitToReturnRate: allVisitorSet.size > 0 ? Math.round((returningVisitors / allVisitorSet.size) * 100) : 0,
    returnToConvertRate: returningVisitors > 0 ? Math.round((convertedVisitors / returningVisitors) * 100) : 0,
    visitToConvertRate: allVisitorSet.size > 0 ? Math.round((convertedVisitors / allVisitorSet.size) * 100) : 0,
  }

  // Top pages formatted
  const formattedTopPages = topPages.map((p) => ({
    path: p.path,
    pageviews: p._count,
    avgDuration: p._avg.duration ? Math.round(p._avg.duration) : null,
    avgScrollDepth: p._avg.scrollDepth ? Math.round(p._avg.scrollDepth) : null,
  }))

  // Top conversion paths: last page before conversion for each converted lead
  const convertedVisitorIdList = convertedLeads
    .map((l) => l.visitorId)
    .filter((id): id is string => id !== null)

  let topConversionPaths: Array<{ path: string; conversions: number }> = []
  if (convertedVisitorIdList.length > 0) {
    const lastPages = await prisma.pageView.findMany({
      where: {
        visitorId: { in: convertedVisitorIdList },
        deletedAt: null,
        sessionId: { not: NIL_UUID },
        path: { not: "/__conversion/lead" },
      },
      orderBy: { timestamp: "desc" },
      select: { visitorId: true, path: true },
    })

    const seenVisitors = new Set<string>()
    const pathCounts = new Map<string, number>()
    for (const pv of lastPages) {
      if (seenVisitors.has(pv.visitorId)) continue
      seenVisitors.add(pv.visitorId)
      pathCounts.set(pv.path, (pathCounts.get(pv.path) || 0) + 1)
    }

    topConversionPaths = Array.from(pathCounts.entries())
      .map(([path, conversions]) => ({ path, conversions }))
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 5)
  }

  // Lead journeys — single query for all pageviews, then group
  let leadJourneys: Array<{
    leadId: string
    leadName: string
    leadSource: string
    convertedAt: string
    pages: Array<{ path: string; duration: number | null; scrollDepth: number | null; timestamp: string }>
  }> = []

  if (convertedLeads.length > 0) {
    const journeyPageViews = await prisma.pageView.findMany({
      where: {
        visitorId: { in: convertedVisitorIdList },
        deletedAt: null,
        sessionId: { not: NIL_UUID },
      },
      orderBy: { timestamp: "asc" },
      select: {
        visitorId: true,
        path: true,
        duration: true,
        scrollDepth: true,
        timestamp: true,
      },
    })

    const pvByVisitor = new Map<string, typeof journeyPageViews>()
    for (const pv of journeyPageViews) {
      const list = pvByVisitor.get(pv.visitorId) || []
      list.push(pv)
      pvByVisitor.set(pv.visitorId, list)
    }

    leadJourneys = convertedLeads.map((lead, index) => ({
      leadId: lead.id,
      leadName: userRole === "FOUNDER" ? lead.name : `Lead #${index + 1}`,
      leadSource: lead.source,
      convertedAt: lead.createdAt.toISOString(),
      pages: (pvByVisitor.get(lead.visitorId!) || []).map((pv) => ({
        path: pv.path,
        duration: pv.duration,
        scrollDepth: pv.scrollDepth,
        timestamp: pv.timestamp.toISOString(),
      })),
    }))
  }

  return NextResponse.json({
    totalPageViews,
    uniqueVisitors,
    avgPagesPerSession,
    avgDurationPerPage,
    durationSampleSize,
    dailyPageViews,
    funnel,
    topPages: formattedTopPages,
    topConversionPaths,
    leadJourneys,
  })
}
