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

    // Store feedback in audit logs
    await logSuccess(
      type === 'BUG' ? AuditAction.SYSTEM_ERROR : AuditAction.USER_CREATED,
      `[FEEDBACK:${type}] ${title}`,
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

    // Send email notification to support team
    // Note: Using basic email sending - you may want to create a formal template later
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'Plan Beta <noreply@planbeta.in>',
        to: process.env.SUPPORT_EMAIL || 'hello@planbeta.in',
        subject: `[FEEDBACK - ${type}] ${title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${type === 'BUG' ? '#dc2626' : type === 'FEATURE' ? '#3b82f6' : '#f59e0b'};">
              ${type === 'BUG' ? '🐛' : type === 'FEATURE' ? '💡' : '❓'} ${type} Report
            </h2>

            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${title}</h3>
              <p style="white-space: pre-wrap;">${description}</p>
            </div>

            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Submitted by:</strong> ${session.user.name || 'Unknown'} (${session.user.email || 'No email'})</p>
              <p style="margin: 5px 0 0 0;"><strong>Page:</strong> ${page}</p>
              <p style="margin: 5px 0 0 0;"><strong>Priority:</strong> ${priority || 'MEDIUM'}</p>
              ${contactEmail ? `<p style="margin: 5px 0 0 0;"><strong>Contact:</strong> ${contactEmail}</p>` : ''}
            </div>

            <p style="color: #6b7280; font-size: 14px;">Submitted on ${new Date().toLocaleString()}</p>
          </div>
        `,
      })
    } catch (emailError) {
      console.error('Failed to send feedback email notification:', emailError)
      // Don't fail the request if email fails
    }

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
        description: {
          startsWith: '[FEEDBACK:',
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
