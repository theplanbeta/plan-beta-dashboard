import { NextRequest, NextResponse } from 'next/server'
import { checkPermission } from '@/lib/api-permissions'
import { prisma } from '@/lib/prisma'
import { statsQuerySchema } from '@/lib/outreach-validation'
import { z } from 'zod'

// GET /api/outreach/stats - Return outreach statistics
export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission('outreach', 'read')
    if (!check.authorized) return check.response

    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    // Validate query params
    let validatedParams: z.infer<typeof statsQuerySchema>
    try {
      validatedParams = statsQuerySchema.parse({
        startDate: startDateParam || undefined,
        endDate: endDateParam || undefined,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid query parameters', details: error.issues },
          { status: 400 }
        )
      }
      throw error
    }

    // Determine date range
    const now = new Date()
    const startOfThisWeek = new Date(now)
    startOfThisWeek.setDate(now.getDate() - now.getDay()) // Sunday
    startOfThisWeek.setHours(0, 0, 0, 0)

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    startOfThisMonth.setHours(0, 0, 0, 0)

    const startDate = validatedParams.startDate
      ? new Date(validatedParams.startDate)
      : startOfThisMonth

    const endDate = validatedParams.endDate
      ? new Date(validatedParams.endDate)
      : now

    // Fetch statistics
    const [
      callsThisWeek,
      callsThisMonth,
      totalCalls,
      sentimentDistribution,
      connectionsMade,
      callsByType,
      callsByPriority,
      avgCallDuration,
      topPerformers,
      upcomingCalls,
    ] = await Promise.all([
      // Calls this week
      prisma.outreachCall.count({
        where: {
          status: 'COMPLETED',
          completedAt: {
            gte: startOfThisWeek,
          },
        },
      }),

      // Calls this month
      prisma.outreachCall.count({
        where: {
          status: 'COMPLETED',
          completedAt: {
            gte: startOfThisMonth,
          },
        },
      }),

      // Total calls (in date range)
      prisma.outreachCall.count({
        where: {
          status: 'COMPLETED',
          completedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),

      // Sentiment distribution
      prisma.outreachCall.groupBy({
        by: ['sentiment'],
        where: {
          status: 'COMPLETED',
          completedAt: {
            gte: startDate,
            lte: endDate,
          },
          sentiment: {
            not: null,
          },
        },
        _count: {
          sentiment: true,
        },
      }),

      // Community connections made
      prisma.studentConnection.count({
        where: {
          introducedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),

      // Calls by type
      prisma.outreachCall.groupBy({
        by: ['callType'],
        where: {
          status: 'COMPLETED',
          completedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          callType: true,
        },
      }),

      // Calls by priority
      prisma.outreachCall.groupBy({
        by: ['priority'],
        where: {
          scheduledDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          priority: true,
        },
      }),

      // Average call duration
      prisma.outreachCall.aggregate({
        where: {
          status: 'COMPLETED',
          completedAt: {
            gte: startDate,
            lte: endDate,
          },
          duration: {
            not: null,
          },
        },
        _avg: {
          duration: true,
        },
      }),

      // Top performers (students with most completed calls)
      prisma.outreachCall.groupBy({
        by: ['studentId'],
        where: {
          status: 'COMPLETED',
          completedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          studentId: true,
        },
        orderBy: {
          _count: {
            studentId: 'desc',
          },
        },
        take: 5,
      }),

      // Upcoming calls (next 7 days)
      prisma.outreachCall.count({
        where: {
          status: {
            in: ['PENDING', 'SNOOZED'],
          },
          scheduledDate: {
            gte: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ])

    // Fetch student details for top performers
    const topPerformerStudentIds = topPerformers.map((p) => p.studentId)
    const topPerformerStudents = await prisma.student.findMany({
      where: {
        id: {
          in: topPerformerStudentIds,
        },
      },
      select: {
        id: true,
        name: true,
        currentLevel: true,
        relationshipDepth: true,
      },
    })

    const topPerformersWithDetails = topPerformers.map((performer) => {
      const student = topPerformerStudents.find(
        (s) => s.id === performer.studentId
      )
      return {
        student,
        callCount: performer._count.studentId,
      }
    })

    // Format sentiment distribution
    const sentimentStats = {
      VERY_POSITIVE: 0,
      POSITIVE: 0,
      NEUTRAL: 0,
      NEGATIVE: 0,
      VERY_NEGATIVE: 0,
    }

    sentimentDistribution.forEach((item) => {
      if (item.sentiment) {
        sentimentStats[item.sentiment as keyof typeof sentimentStats] =
          item._count.sentiment
      }
    })

    // Format calls by type
    const callTypeStats: Record<string, number> = {}
    callsByType.forEach((item) => {
      callTypeStats[item.callType] = item._count.callType
    })

    // Format calls by priority
    const priorityStats: Record<string, number> = {}
    callsByPriority.forEach((item) => {
      priorityStats[item.priority] = item._count.priority
    })

    // Calculate completion rate
    const totalScheduled = await prisma.outreachCall.count({
      where: {
        scheduledDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    const completionRate =
      totalScheduled > 0 ? (totalCalls / totalScheduled) * 100 : 0

    return NextResponse.json({
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      summary: {
        callsThisWeek,
        callsThisMonth,
        totalCalls,
        upcomingCalls,
        connectionsMade,
        avgCallDuration: Math.round(avgCallDuration._avg.duration || 0),
        completionRate: Math.round(completionRate),
      },
      sentiment: sentimentStats,
      callsByType: callTypeStats,
      callsByPriority: priorityStats,
      topPerformers: topPerformersWithDetails,
    })
  } catch (error) {
    console.error('Failed to fetch outreach stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch outreach stats' },
      { status: 500 }
    )
  }
}
