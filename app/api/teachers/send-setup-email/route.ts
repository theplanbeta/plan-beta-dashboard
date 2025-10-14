import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission } from '@/lib/api-permissions'
import { z } from 'zod'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logSuccess } from '@/lib/audit'
import { AuditAction } from '@prisma/client'
import { sendEmail } from '@/lib/email'

const limiter = rateLimit(RATE_LIMITS.STANDARD)

// Validation schema
const sendSetupEmailSchema = z.object({
  teacherIds: z.array(z.string()).min(1, 'At least one teacher ID is required'),
})

// POST /api/teachers/send-setup-email - Send setup invitation emails (FOUNDER only)
export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await limiter(req)
    if (rateLimitResult) return rateLimitResult

    const check = await checkPermission('teachers', 'update')
    if (!check.authorized) return check.response

    const body = await req.json()

    // Validate request
    const validation = sendSetupEmailSchema.safeParse(body)
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
      details: [] as Array<{ teacherId: string; teacherName: string; status: string; reason?: string }>,
    }

    // Send emails to each teacher
    for (const teacher of teachers) {
      // Only send to teachers with @planbeta.internal emails
      if (!teacher.email.includes('@planbeta.internal')) {
        results.skipped++
        results.details.push({
          teacherId: teacher.id,
          teacherName: teacher.name,
          status: 'skipped',
          reason: 'Already has a real email address',
        })
        continue
      }

      try {
        const emailResult = await sendEmail('teacher-setup-invite', {
          to: teacher.email,
          teacherName: teacher.name,
          email: teacher.email,
          password: 'temporary123',
        })

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
            `Setup invitation email sent to teacher: ${teacher.name} (${teacher.email})`,
            {
              entityType: 'User',
              entityId: teacher.id,
              metadata: {
                teacherName: teacher.name,
                teacherEmail: teacher.email,
                action: 'setup_email_sent',
              },
              request: req,
            }
          )

          console.log(`✅ Setup email sent to ${teacher.name} (${teacher.email})`)
        } else {
          results.failed++
          results.details.push({
            teacherId: teacher.id,
            teacherName: teacher.name,
            status: 'failed',
            reason: 'Email service error',
          })
          console.error(`⚠️ Failed to send setup email to ${teacher.name}:`, emailResult.error)
        }
      } catch (error) {
        results.failed++
        results.details.push({
          teacherId: teacher.id,
          teacherName: teacher.name,
          status: 'failed',
          reason: 'Unexpected error',
        })
        console.error(`⚠️ Error sending setup email to ${teacher.name}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${teachers.length} teacher(s)`,
      results,
    })
  } catch (error) {
    console.error('Error sending setup emails:', error)
    return NextResponse.json(
      { error: 'Failed to send setup emails' },
      { status: 500 }
    )
  }
}
