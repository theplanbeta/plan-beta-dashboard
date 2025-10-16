import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission } from '@/lib/api-permissions'
import { z } from 'zod'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logSuccess } from '@/lib/audit'
import { AuditAction } from '@prisma/client'
import { sendEmail } from '@/lib/email'
import crypto from 'crypto'

const limiter = rateLimit(RATE_LIMITS.STANDARD)

// Validation schema
const sendWelcomeEmailSchema = z.object({
  teacherIds: z.array(z.string()).min(1, 'At least one teacher ID is required'),
})

/**
 * POST /api/teachers/send-welcome-email
 * Send welcome emails to teachers with a magic login link
 *
 * Features:
 * - Sends to ALL teachers (not just @planbeta.internal)
 * - Generates secure one-time login token (24-hour expiry)
 * - Magic link that auto-logs in and redirects to password setup
 * - No password in email (better security and UX)
 * - Audit logging for all sent emails
 */
export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await limiter(req)
    if (rateLimitResult) return rateLimitResult

    const check = await checkPermission('teachers', 'update')
    if (!check.authorized) return check.response

    const body = await req.json()

    // Validate request
    const validation = sendWelcomeEmailSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { teacherIds } = validation.data

    // Fetch teachers
    const teachers = await prisma.user.findMany({
      where: {
        id: { in: teacherIds },
        role: 'TEACHER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        password: true,
      },
    })

    if (teachers.length === 0) {
      return NextResponse.json(
        { error: 'No valid teachers found' },
        { status: 404 }
      )
    }

    const results = {
      sent: 0,
      failed: 0,
      tokensGenerated: 0,
      details: [] as Array<{
        teacherId: string
        teacherName: string
        status: string
        reason?: string
      }>,
    }

    // Send emails to each teacher
    for (const teacher of teachers) {
      // Generate secure welcome token
      const welcomeToken = crypto.randomBytes(32).toString('hex')
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now

      // Store token in database
      try {
        await prisma.user.update({
          where: { id: teacher.id },
          data: {
            welcomeToken,
            welcomeTokenExpiry: tokenExpiry,
            requirePasswordChange: true,
          },
        })

        results.tokensGenerated++
        console.log(`🔑 Generated welcome token for ${teacher.name} (${teacher.email})`)
      } catch (error) {
        console.error(`⚠️ Failed to generate token for ${teacher.name}:`, error)
        results.failed++
        results.details.push({
          teacherId: teacher.id,
          teacherName: teacher.name,
          status: 'failed',
          reason: 'Failed to generate login link',
        })
        continue
      }

      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://plan-beta-dashboard.vercel.app'
        const welcomeUrl = `${baseUrl}/auth/welcome-login?token=${welcomeToken}`

        const emailData = {
          to: teacher.email,
          teacherName: teacher.name,
          email: teacher.email,
          welcomeUrl,
          expiryHours: '24',
        }

        console.log(`📧 Sending welcome email to ${teacher.email}`)

        const emailResult = await sendEmail('teacher-welcome', emailData)

        if (emailResult.success) {
          results.sent++
          results.details.push({
            teacherId: teacher.id,
            teacherName: teacher.name,
            status: 'sent',
          })

          // Audit log
          await logSuccess(
            AuditAction.USER_UPDATED,
            `Welcome email with magic link sent to teacher: ${teacher.name} (${teacher.email})`,
            {
              entityType: 'User',
              entityId: teacher.id,
              metadata: {
                teacherName: teacher.name,
                teacherEmail: teacher.email,
                action: 'welcome_email_sent',
                tokenExpiry: tokenExpiry.toISOString(),
              },
              request: req,
            }
          )

          console.log(`✅ Welcome email sent to ${teacher.name} (${teacher.email})`)
        } else {
          results.failed++
          results.details.push({
            teacherId: teacher.id,
            teacherName: teacher.name,
            status: 'failed',
            reason: 'Email service error',
          })
          console.error(`⚠️ Failed to send welcome email to ${teacher.name}:`, emailResult.error)
        }
      } catch (error) {
        results.failed++
        results.details.push({
          teacherId: teacher.id,
          teacherName: teacher.name,
          status: 'failed',
          reason: 'Unexpected error',
        })
        console.error(`⚠️ Error sending welcome email to ${teacher.name}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${teachers.length} teacher(s)`,
      results,
    })
  } catch (error) {
    console.error('Error sending welcome emails:', error)
    return NextResponse.json(
      { error: 'Failed to send welcome emails' },
      { status: 500 }
    )
  }
}
