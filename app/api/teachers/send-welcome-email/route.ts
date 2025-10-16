import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission } from '@/lib/api-permissions'
import { z } from 'zod'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logSuccess } from '@/lib/audit'
import { AuditAction } from '@prisma/client'
import { sendEmail } from '@/lib/email'
import bcrypt from 'bcryptjs'

const limiter = rateLimit(RATE_LIMITS.STANDARD)

// Validation schema
const sendWelcomeEmailSchema = z.object({
  teacherIds: z.array(z.string()).min(1, 'At least one teacher ID is required'),
})

/**
 * POST /api/teachers/send-welcome-email
 * Send welcome emails to teachers with their login credentials
 *
 * Features:
 * - Sends to ALL teachers (not just @planbeta.internal)
 * - Optionally generates and sends new random password
 * - Professional welcome email template with credentials
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
      skipped: 0,
      passwordsReset: 0,
      details: [] as Array<{
        teacherId: string
        teacherName: string
        status: string
        reason?: string
        newPassword?: string
      }>,
    }

    // Generate random password
    const generatePassword = () => {
      const length = 12
      const charset = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*'
      let password = ''
      for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length))
      }
      return password
    }

    // Send emails to each teacher
    for (const teacher of teachers) {
      // Always generate new password for welcome emails
      const newPassword = generatePassword()
      const hashedPassword = await bcrypt.hash(newPassword, 10)
      let passwordToSend = newPassword
      let passwordUpdated = false

      // Update password in database and set requirePasswordChange flag
      try {
        await prisma.user.update({
          where: { id: teacher.id },
          data: {
            password: hashedPassword,
            requirePasswordChange: true,
          },
        })

        passwordUpdated = true
        results.passwordsReset++
      } catch (error) {
        console.error(`⚠️ Failed to reset password for ${teacher.name}:`, error)
        results.failed++
        results.details.push({
          teacherId: teacher.id,
          teacherName: teacher.name,
          status: 'failed',
          reason: 'Failed to reset password',
        })
        continue
      }

      try {
        const emailData = {
          to: teacher.email,
          teacherName: teacher.name,
          email: teacher.email,
          password: passwordToSend,
          loginUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://plan-beta-dashboard.vercel.app',
        }

        console.log(`📧 Sending email to ${teacher.email} with login URL: ${emailData.loginUrl}`)

        const emailResult = await sendEmail('teacher-welcome', emailData)

        if (emailResult.success) {
          results.sent++
          results.details.push({
            teacherId: teacher.id,
            teacherName: teacher.name,
            status: 'sent',
            newPassword: passwordUpdated ? passwordToSend : undefined,
          })

          // Audit log
          await logSuccess(
            AuditAction.USER_UPDATED,
            `Welcome email sent to teacher: ${teacher.name} (${teacher.email})${passwordUpdated ? ' with new password' : ''}`,
            {
              entityType: 'User',
              entityId: teacher.id,
              metadata: {
                teacherName: teacher.name,
                teacherEmail: teacher.email,
                action: 'welcome_email_sent',
                passwordReset: passwordUpdated,
              },
              request: req,
            }
          )

          console.log(`✅ Welcome email sent to ${teacher.name} (${teacher.email})${passwordUpdated ? ' with new password' : ''}`)
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
