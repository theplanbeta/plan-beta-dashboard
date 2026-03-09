import { prisma } from "@/lib/prisma"

// --- Types ---

interface UTMBreakdownItem {
  source: string
  leads: number
  conversions: number
  conversionRate: number
}

interface CampaignBreakdownItem {
  campaign: string
  leads: number
  conversions: number
  conversionRate: number
}

interface LinkClickStats {
  totalClicks: number
  uniqueVisitors: number
  topLinks: {
    slug: string
    name: string
    clicks: number
  }[]
}

interface ContentPerformanceItem {
  id: string
  platform: string
  contentType: string
  contentUrl: string
  views: number
  likes: number
  comments: number
  shares: number
  leadsGenerated: number
  enrollments: number
  roi: number | null
}

interface FirstPartyAllData {
  utmBreakdown: UTMBreakdownItem[] | null
  campaignBreakdown: CampaignBreakdownItem[] | null
  linkClickStats: LinkClickStats | null
  contentPerformance: ContentPerformanceItem[] | null
}

// --- Helpers ---

function daysAgoDate(days: number): Date {
  return new Date(Date.now() - days * 86400000)
}

// --- Functions ---

export async function getUTMBreakdown(
  days: number
): Promise<UTMBreakdownItem[] | null> {
  try {
    const since = daysAgoDate(days)

    const leads = await prisma.lead.findMany({
      where: {
        createdAt: { gte: since },
        utmSource: { not: null },
      },
      select: {
        utmSource: true,
        converted: true,
      },
    })

    // Group by utmSource
    const grouped = new Map<
      string,
      { leads: number; conversions: number }
    >()

    for (const lead of leads) {
      const source = lead.utmSource || "unknown"
      const entry = grouped.get(source) || { leads: 0, conversions: 0 }
      entry.leads++
      if (lead.converted) entry.conversions++
      grouped.set(source, entry)
    }

    return Array.from(grouped.entries())
      .map(([source, data]) => ({
        source,
        leads: data.leads,
        conversions: data.conversions,
        conversionRate:
          data.leads > 0
            ? Math.round((data.conversions / data.leads) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.leads - a.leads)
  } catch (error) {
    console.error("[FirstParty] Error fetching UTM breakdown:", error)
    return null
  }
}

export async function getCampaignBreakdown(
  days: number
): Promise<CampaignBreakdownItem[] | null> {
  try {
    const since = daysAgoDate(days)

    const leads = await prisma.lead.findMany({
      where: {
        createdAt: { gte: since },
        utmCampaign: { not: null },
      },
      select: {
        utmCampaign: true,
        converted: true,
      },
    })

    const grouped = new Map<
      string,
      { leads: number; conversions: number }
    >()

    for (const lead of leads) {
      const campaign = lead.utmCampaign || "unknown"
      const entry = grouped.get(campaign) || { leads: 0, conversions: 0 }
      entry.leads++
      if (lead.converted) entry.conversions++
      grouped.set(campaign, entry)
    }

    return Array.from(grouped.entries())
      .map(([campaign, data]) => ({
        campaign,
        leads: data.leads,
        conversions: data.conversions,
        conversionRate:
          data.leads > 0
            ? Math.round((data.conversions / data.leads) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.leads - a.leads)
  } catch (error) {
    console.error("[FirstParty] Error fetching campaign breakdown:", error)
    return null
  }
}

export async function getLinkClickStats(
  days: number
): Promise<LinkClickStats | null> {
  try {
    const since = daysAgoDate(days)

    const totalClicks = await prisma.linkClick.count({
      where: { clickedAt: { gte: since } },
    })

    // Approximate unique visitors by counting distinct device+country combos
    // A more accurate approach would need a visitor ID, but LinkClick doesn't have one
    const clicksWithLinks = await prisma.linkClick.findMany({
      where: { clickedAt: { gte: since } },
      select: {
        linkId: true,
        deviceType: true,
        browser: true,
        country: true,
      },
    })

    // Rough unique visitor estimate using device fingerprint
    const visitorSet = new Set<string>()
    for (const click of clicksWithLinks) {
      visitorSet.add(
        `${click.deviceType || ""}|${click.browser || ""}|${click.country || ""}`
      )
    }

    // Top links by click count
    const topLinksRaw = await prisma.linkClick.groupBy({
      by: ["linkId"],
      where: { clickedAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 15,
    })

    // Fetch link details
    const linkIds = topLinksRaw.map((l) => l.linkId)
    const links = await prisma.utmLink.findMany({
      where: { id: { in: linkIds } },
      select: { id: true, slug: true, name: true },
    })
    const linkMap = new Map(links.map((l) => [l.id, l]))

    const topLinks = topLinksRaw.map((item) => {
      const link = linkMap.get(item.linkId)
      return {
        slug: link?.slug || item.linkId,
        name: link?.name || "Unknown",
        clicks: item._count.id,
      }
    })

    return {
      totalClicks,
      uniqueVisitors: visitorSet.size,
      topLinks,
    }
  } catch (error) {
    console.error("[FirstParty] Error fetching link click stats:", error)
    return null
  }
}

export async function getContentPerformance(
  days: number
): Promise<ContentPerformanceItem[] | null> {
  try {
    const since = daysAgoDate(days)

    const content = await prisma.contentPerformance.findMany({
      where: { publishedAt: { gte: since } },
      orderBy: { views: "desc" },
      take: 15,
      select: {
        id: true,
        platform: true,
        contentType: true,
        contentUrl: true,
        views: true,
        likes: true,
        comments: true,
        shares: true,
        leadsGenerated: true,
        enrollments: true,
        roi: true,
      },
    })

    return content.map((item) => ({
      id: item.id,
      platform: item.platform,
      contentType: item.contentType,
      contentUrl: item.contentUrl,
      views: item.views,
      likes: item.likes,
      comments: item.comments,
      shares: item.shares,
      leadsGenerated: item.leadsGenerated,
      enrollments: item.enrollments,
      roi: item.roi ? Number(item.roi) : null,
    }))
  } catch (error) {
    console.error("[FirstParty] Error fetching content performance:", error)
    return null
  }
}

export async function fetchAllFirstPartyData(
  days: number
): Promise<FirstPartyAllData | null> {
  const [utmBreakdown, campaignBreakdown, linkClickStats, contentPerformance] =
    await Promise.all([
      getUTMBreakdown(days),
      getCampaignBreakdown(days),
      getLinkClickStats(days),
      getContentPerformance(days),
    ])

  return {
    utmBreakdown,
    campaignBreakdown,
    linkClickStats,
    contentPerformance,
  }
}
