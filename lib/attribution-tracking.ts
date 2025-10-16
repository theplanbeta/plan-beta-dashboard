/**
 * Attribution Tracking System
 * Tracks the journey: Reel → Lead → Enrollment
 */

import { prisma } from './prisma'

/**
 * Update content performance metrics when a lead is created from a reel
 */
export async function trackLeadFromContent(leadId: string, contentId: string) {
  try {
    // Update content performance - increment leads generated
    await prisma.contentPerformance.update({
      where: { contentId },
      data: {
        leadsGenerated: {
          increment: 1,
        },
      },
    })

    console.log(`✅ Attribution tracked: Content ${contentId} → Lead ${leadId}`)
  } catch (error) {
    console.error('Error tracking lead attribution:', error)
  }
}

/**
 * Update content performance metrics when a lead converts to enrollment
 * Also calculate ROI based on enrollment revenue
 */
export async function trackEnrollmentFromContent(
  leadId: string,
  enrollmentRevenue: number
) {
  try {
    // Get the lead to find associated content
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        sourceReelId: true,
        sourceContent: {
          select: {
            id: true,
            contentId: true,
            enrollments: true,
            revenue: true,
            views: true,
          },
        },
      },
    })

    if (!lead?.sourceContent) {
      console.log('⏭️ No source content found for lead, skipping attribution')
      return
    }

    const content = lead.sourceContent

    // Update content performance
    const updatedContent = await prisma.contentPerformance.update({
      where: { contentId: content.contentId },
      data: {
        enrollments: {
          increment: 1,
        },
        revenue: {
          increment: enrollmentRevenue,
        },
      },
    })

    // Calculate ROI
    // Assuming organic content (no ad spend), ROI is based purely on revenue generated
    // ROI formula: (Revenue / Estimated Cost) * 100
    // For organic content, we can use a nominal cost per view (e.g., ₹0.01 per view for content creation)
    const estimatedCost = content.views * 0.01 // ₹0.01 per view
    const totalRevenue = Number(updatedContent.revenue)
    const roi = estimatedCost > 0 ? ((totalRevenue - estimatedCost) / estimatedCost) * 100 : 0

    // Calculate conversion rate
    const conversionRate = content.views > 0
      ? (updatedContent.enrollments / content.views) * 100
      : 0

    // Update ROI and conversion rate
    await prisma.contentPerformance.update({
      where: { contentId: content.contentId },
      data: {
        roi: parseFloat(roi.toFixed(2)),
        conversionRate: parseFloat(conversionRate.toFixed(4)),
      },
    })

    console.log(`✅ Attribution tracked: Content ${content.contentId} → Enrollment (Revenue: ₹${enrollmentRevenue})`)
    console.log(`   - ROI: ${roi.toFixed(2)}%`)
    console.log(`   - Conversion Rate: ${conversionRate.toFixed(4)}%`)

    return {
      contentId: content.contentId,
      roi,
      conversionRate,
    }
  } catch (error) {
    console.error('Error tracking enrollment attribution:', error)
  }
}

/**
 * Get attribution report for a specific content item
 */
export async function getContentAttribution(contentId: string) {
  try {
    const content = await prisma.contentPerformance.findUnique({
      where: { contentId },
      include: {
        leads: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            instagramHandle: true,
            status: true,
            converted: true,
            leadScore: true,
            createdAt: true,
          },
        },
      },
    })

    if (!content) {
      return null
    }

    const totalLeads = content.leads.length
    const convertedLeads = content.leads.filter(l => l.converted).length
    const pendingLeads = content.leads.filter(l => !l.converted && l.status !== 'LOST').length
    const avgLeadScore = totalLeads > 0
      ? content.leads.reduce((sum, l) => sum + l.leadScore, 0) / totalLeads
      : 0

    return {
      content: {
        id: content.id,
        contentUrl: content.contentUrl,
        platform: content.platform,
        contentType: content.contentType,
        topic: content.topic,
        publishedAt: content.publishedAt,
        caption: content.caption,
        hashtags: content.hashtags,
      },
      metrics: {
        views: content.views,
        likes: content.likes,
        comments: content.comments,
        shares: content.shares,
        saves: content.saves,
        engagementRate: content.engagementRate,
      },
      attribution: {
        totalLeads,
        convertedLeads,
        pendingLeads,
        avgLeadScore,
        revenue: Number(content.revenue),
        roi: Number(content.roi || 0),
        conversionRate: Number(content.conversionRate || 0),
      },
      leads: content.leads,
    }
  } catch (error) {
    console.error('Error getting content attribution:', error)
    return null
  }
}

/**
 * Get top performing content based on different metrics
 */
export async function getTopPerformingContent(
  metric: 'views' | 'engagementRate' | 'leadsGenerated' | 'enrollments' | 'roi',
  limit: number = 10
) {
  try {
    const orderBy: any = {}
    orderBy[metric] = 'desc'

    const content = await prisma.contentPerformance.findMany({
      orderBy,
      take: limit,
      include: {
        leads: {
          select: {
            id: true,
            converted: true,
          },
        },
      },
    })

    return content.map(item => ({
      ...item,
      leadsGenerated: item.leads.length,
      enrollments: item.leads.filter(l => l.converted).length,
    }))
  } catch (error) {
    console.error('Error getting top performing content:', error)
    return []
  }
}
