import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logSuccess } from '@/lib/audit'
import { AuditAction } from '@prisma/client'

const limiter = rateLimit(RATE_LIMITS.STANDARD)

const feedbackSchema = z.object({
  type: z.enum(['BUG', 'FEATURE', 'QUESTION']),
  title: z.string().min(5, 'Title too short').max(200, 'Title too long'),
  description: z.string().min(20, 'Description too short').max(2000, 'Description too long'),
  page: z.string().min(1, 'Page required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
})

// POST /api/feedback - Submit feedback
export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await limiter(req)
    if (rateLimitResult) return rateLimitResult

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validation = feedbackSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { type, title, description, page, priority, contactEmail } = validation.data

    // Store feedback in audit logs with a special action
    await logSuccess(
      AuditAction.API_REQUEST,
      `[${type}] ${title}`,
      {
        entityType: 'Feedback',
        entityId: 'system',
        metadata: {
          feedbackType: type,
          title,
          description,
          page,
          priority: priority || 'MEDIUM',
          contactEmail: contactEmail || session.user.email || 'anonymous',
          submittedBy: session.user.name || session.user.email,
          userId: session.user.id,
        },
        request: req,
      }
    )

    // TODO: Optionally send email notification to admin
    // await sendEmail({
    //   to: 'admin@planbeta.in',
    //   subject: `[${type}] ${title}`,
    //   text: `
    //     Feedback Type: ${type}
    //     Page: ${page}
    //     Priority: ${priority || 'MEDIUM'}
    //     Submitted by: ${session.user.name} (${session.user.email})
    //
    //     ${description}
    //
    //     Contact: ${contactEmail || session.user.email}
    //   `
    // })

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
    })
  } catch (error) {
    console.error('Error submitting feedback:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}

// GET /api/feedback - Get all feedback (FOUNDER only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'FOUNDER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get feedback from audit logs
    const feedbackLogs = await prisma.auditLog.findMany({
      where: {
        action: AuditAction.API_REQUEST,
        description: {
          startsWith: '[',
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    })

    const feedback = feedbackLogs
      .filter((log) => {
        try {
          const metadata = log.metadata as any
          return metadata?.feedbackType !== undefined
        } catch {
          return false
        }
      })
      .map((log) => ({
        id: log.id,
        type: (log.metadata as any)?.feedbackType,
        title: (log.metadata as any)?.title,
        description: (log.metadata as any)?.description,
        page: (log.metadata as any)?.page,
        priority: (log.metadata as any)?.priority || 'MEDIUM',
        contactEmail: (log.metadata as any)?.contactEmail,
        submittedBy: (log.metadata as any)?.submittedBy,
        userId: (log.metadata as any)?.userId,
        createdAt: log.createdAt,
      }))

    return NextResponse.json(feedback)
  } catch (error) {
    console.error('Error fetching feedback:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}
