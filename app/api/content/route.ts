import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extractHashtags, detectTopic, calculateEngagementRate } from '@/lib/instagram-api'
import { z } from 'zod'

// Validation schema for creating content
const createContentSchema = z.object({
  platform: z.enum(['INSTAGRAM', 'YOUTUBE', 'FACEBOOK', 'TIKTOK']),
  contentType: z.enum(['REEL', 'POST', 'STORY', 'VIDEO', 'SHORT']),
  contentId: z.string(),
  contentUrl: z.string().url(),
  publishedAt: z.string().datetime(),
  caption: z.string().optional(),
  views: z.number().int().min(0).optional(),
  reach: z.number().int().min(0).optional(),
  likes: z.number().int().min(0).optional(),
  comments: z.number().int().min(0).optional(),
  shares: z.number().int().min(0).optional(),
  saves: z.number().int().min(0).optional(),
  topic: z.string().optional(),
})

/**
 * GET /api/content
 * Fetch all content performance data with optional filters and stats
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')
    const contentType = searchParams.get('contentType')
    const topic = searchParams.get('topic')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const sortBy = searchParams.get('sortBy') || 'publishedAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build where clause
    const where: any = {}
    if (platform && platform !== 'all') where.platform = platform
    if (contentType && contentType !== 'all') where.contentType = contentType
    if (topic && topic !== 'all') where.topic = topic
    if (startDate || endDate) {
      where.publishedAt = {}
      if (startDate) where.publishedAt.gte = new Date(startDate)
      if (endDate) where.publishedAt.lte = new Date(endDate)
    }

    // Build orderBy
    const orderBy: any = {}
    orderBy[sortBy] = sortOrder

    const content = await prisma.contentPerformance.findMany({
      where,
      orderBy,
      take: limit,
      include: {
        leads: {
          select: {
            id: true,
            name: true,
            status: true,
            converted: true,
            instagramHandle: true,
          },
        },
      },
    })

    // Calculate stats
    const allContent = await prisma.contentPerformance.findMany({ where })

    const stats = {
      totalContent: allContent.length,
      totalViews: allContent.reduce((sum, c) => sum + c.views, 0),
      totalReach: allContent.reduce((sum, c) => sum + (c.reach || 0), 0),
      totalEngagements: allContent.reduce((sum, c) => sum + c.likes + c.comments + c.shares + c.saves, 0),
      totalLeads: allContent.reduce((sum, c) => sum + c.leadsGenerated, 0),
      totalEnrollments: allContent.reduce((sum, c) => sum + c.enrollments, 0),
      totalRevenue: allContent.reduce((sum, c) => sum + Number(c.revenue), 0),
      avgEngagementRate: allContent.length > 0
        ? allContent.reduce((sum, c) => sum + Number(c.engagementRate || 0), 0) / allContent.length
        : 0,
    }

    // Add lead count for each content item
    const contentWithCounts = content.map(item => ({
      ...item,
      leadsGenerated: item.leads.length,
      enrollments: item.leads.filter(l => l.converted).length,
    }))

    return NextResponse.json({
      content: contentWithCounts,
      stats,
    })
  } catch (error) {
    console.error('Error fetching content:', error)
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
  }
}

/**
 * POST /api/content
 * Create a new content performance entry
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createContentSchema.parse(body)

    // Extract hashtags from caption
    const hashtags = extractHashtags(validatedData.caption)

    // Detect topic if not provided
    const topic = validatedData.topic || detectTopic(validatedData.caption)

    // Calculate engagement rate if metrics are provided
    const views = validatedData.views || 0
    const reach = validatedData.reach || 0
    const likes = validatedData.likes || 0
    const comments = validatedData.comments || 0
    const shares = validatedData.shares || 0
    const saves = validatedData.saves || 0

    const engagementDenominator = reach > 0 ? reach : views

    const engagementRate = engagementDenominator > 0
      ? calculateEngagementRate(likes, comments, shares, engagementDenominator, saves)
      : null

    // Check if content already exists
    const existingContent = await prisma.contentPerformance.findUnique({
      where: { contentId: validatedData.contentId },
    })

    if (existingContent) {
      return NextResponse.json(
        { error: 'Content with this ID already exists' },
        { status: 409 }
      )
    }

    // Create content performance entry
    const content = await prisma.contentPerformance.create({
      data: {
        platform: validatedData.platform,
        contentType: validatedData.contentType,
        contentId: validatedData.contentId,
        contentUrl: validatedData.contentUrl,
        publishedAt: new Date(validatedData.publishedAt),
        caption: validatedData.caption,
        hashtags,
        topic,
        views,
        reach,
        likes,
        comments,
        shares,
        saves,
        engagementRate: engagementRate ? parseFloat(engagementRate.toFixed(2)) : null,
      },
    })

    return NextResponse.json(content, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 })
    }

    console.error('Error creating content:', error)
    return NextResponse.json({ error: 'Failed to create content' }, { status: 500 })
  }
}

/**
 * PATCH /api/content
 * Update content performance metrics
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contentId, ...updates } = body

    if (!contentId) {
      return NextResponse.json({ error: 'contentId is required' }, { status: 400 })
    }

    // Recalculate engagement rate if metrics are updated
    if (updates.views || updates.reach || updates.likes || updates.comments || updates.shares || updates.saves) {
      const content = await prisma.contentPerformance.findUnique({
        where: { contentId },
      })

      if (content) {
        const views = updates.views ?? content.views
        const reach = updates.reach ?? content.reach
        const likes = updates.likes ?? content.likes
        const comments = updates.comments ?? content.comments
        const shares = updates.shares ?? content.shares
        const saves = updates.saves ?? content.saves

        const denominator = reach > 0 ? reach : views

        if (denominator > 0) {
          updates.engagementRate = parseFloat(
            calculateEngagementRate(likes, comments, shares, denominator, saves).toFixed(2)
          )
        }
      }
    }

    const updatedContent = await prisma.contentPerformance.update({
      where: { contentId },
      data: updates,
    })

    return NextResponse.json(updatedContent)
  } catch (error) {
    console.error('Error updating content:', error)
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 })
  }
}
