import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import InstagramAPI, {
  extractHashtags,
  detectTopic,
  calculateEngagementRate,
  type InstagramMediaInsights,
} from '@/lib/instagram-api'

/**
 * POST /api/instagram/sync
 * Sync all Instagram reels/posts with real metrics from Instagram Graph API
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const instagramAPI = new InstagramAPI()

    // Fetch all media from Instagram
    const media = await instagramAPI.getMediaList(50) // Get up to 50 recent posts

    const results = {
      total: media.length,
      created: 0,
      updated: 0,
      errors: 0,
      items: [] as any[],
    }

    for (const item of media) {
      try {
        // Extract hashtags and detect topic
        const hashtags = extractHashtags(item.caption)
        const topic = detectTopic(item.caption)

        // Try to get insights, but don't fail if unavailable
        let insights: InstagramMediaInsights | null = null
        try {
          insights = await instagramAPI.getMediaInsights(item.id, item.media_type)
        } catch (insightError: any) {
          // Insights not available - use basic metrics if available
          console.log(`⚠️ Insights unavailable for ${item.id}, using basic metrics`)
        }

        const toNumber = (value: unknown): number => {
          if (typeof value === 'number') return value
          if (typeof value === 'string') {
            const parsed = Number(value)
            return Number.isFinite(parsed) ? parsed : 0
          }
          return 0
        }

        const impressions = toNumber(insights?.impressions)
        const plays = toNumber(insights?.plays ?? insights?.video_views)
        const reach = toNumber(insights?.reach)
        const saves = toNumber(insights?.saved)
        const shares = toNumber(insights?.shares)

        // Baseline metrics from media payload (always available)
        const baseLikes = toNumber(item.like_count)
        const baseComments = toNumber(item.comments_count)

        const primaryViews = plays || impressions || reach
        const engagementDenominator = reach || impressions || plays || 0

        const normalizedViews = Math.max(0, Math.round(primaryViews))
        const normalizedReach = Math.max(0, Math.round(reach))
        const normalizedLikes = Math.max(0, Math.round(baseLikes))
        const normalizedComments = Math.max(0, Math.round(baseComments))
        const normalizedShares = Math.max(0, Math.round(shares))
        const normalizedSaves = Math.max(0, Math.round(saves))

        // Calculate engagement rate
        const engagementRate = engagementDenominator > 0
          ? calculateEngagementRate(
              normalizedLikes,
              normalizedComments,
              normalizedShares,
              engagementDenominator,
              normalizedSaves
            )
          : 0

        const contentType =
          item.media_type === 'REELS' || item.media_product_type === 'REELS'
            ? 'REEL'
            : 'POST'

        const baseData = {
          views: normalizedViews,
          reach: normalizedReach,
          likes: normalizedLikes,
          comments: normalizedComments,
          shares: normalizedShares,
          saves: normalizedSaves,
          engagementRate: engagementRate ? parseFloat(engagementRate.toFixed(2)) : null,
        }

        // Check if content already exists
        const existingContent = await prisma.contentPerformance.findUnique({
          where: { contentId: item.id },
        })

        if (existingContent) {
          // Update existing content
          await prisma.contentPerformance.update({
            where: { contentId: item.id },
            data: {
              ...baseData,
              contentType,
            },
          })
          results.updated++
        } else {
          // Create new content entry
          await prisma.contentPerformance.create({
            data: {
              platform: 'INSTAGRAM',
              contentType,
              contentId: item.id,
              contentUrl: item.permalink,
              publishedAt: new Date(item.timestamp),
              caption: item.caption,
              hashtags,
              topic,
              ...baseData,
            },
          })
          results.created++
        }

        results.items.push({
          id: item.id,
          type: item.media_type,
          caption: item.caption?.substring(0, 50) + '...',
          views: normalizedViews,
          reach: normalizedReach,
          plays: Math.max(0, Math.round(plays)),
          engagement: engagementRate ? parseFloat(engagementRate.toFixed(2)) + '%' : 'N/A',
          status: existingContent ? 'updated' : 'created',
        })

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (error: any) {
        console.error(`Error processing media ${item.id}:`, error)
        results.errors++
        results.items.push({
          id: item.id,
          error: error.message,
          status: 'error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${results.total} items: ${results.created} created, ${results.updated} updated, ${results.errors} errors`,
      results,
    })

  } catch (error: any) {
    console.error('Instagram sync error:', error)
    return NextResponse.json(
      {
        error: 'Failed to sync Instagram content',
        details: error.response?.data || error.message
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/instagram/sync
 * Get sync status and last sync time
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get total content count and last sync time
    const totalContent = await prisma.contentPerformance.count({
      where: { platform: 'INSTAGRAM' },
    })

    const lastSync = await prisma.contentPerformance.findFirst({
      where: { platform: 'INSTAGRAM' },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    })

    return NextResponse.json({
      totalContent,
      lastSyncAt: lastSync?.updatedAt,
    })

  } catch (error: any) {
    console.error('Error getting sync status:', error)
    return NextResponse.json({ error: 'Failed to get sync status' }, { status: 500 })
  }
}
