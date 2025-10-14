import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission } from '@/lib/api-permissions'
import { z } from 'zod'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logSuccess } from '@/lib/audit'
import { AuditAction } from '@prisma/client'

const limiter = rateLimit(RATE_LIMITS.STANDARD)

// Validation schema for updating teacher
const updateTeacherSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email address').min(1, 'Email is required').optional(),
  active: z.boolean().optional(),
  teacherLevels: z.array(z.enum(['NEW', 'A1', 'A1_HYBRID', 'A1_HYBRID_MALAYALAM', 'A2', 'B1', 'B2', 'SPOKEN_GERMAN'])).optional(),
  teacherTimings: z.array(z.enum(['Morning', 'Evening'])).optional(),
  teacherTimeSlots: z.array(z.object({
    startTime: z.string(),
    endTime: z.string(),
  })).optional(),
  hourlyRate: z.record(z.string(), z.number()).optional(),
  currency: z.enum(['EUR', 'INR']).optional(),
  whatsapp: z.string().optional(),
  remarks: z.string().optional(),
})

// GET /api/teachers/[id] - Get single teacher by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const check = await checkPermission('teachers', 'read')
    if (!check.authorized) return check.response

    const { id } = await params

    const teacher = await prisma.user.findUnique({
      where: {
        id: id,
        role: 'TEACHER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        teacherLevels: true,
        teacherTimings: true,
        teacherTimeSlots: true,
        hourlyRate: true,
        currency: true,
        whatsapp: true,
        remarks: true,
        createdAt: true,
        batches: {
          where: {
            status: {
              in: ['RUNNING', 'FILLING']
            }
          },
          select: {
            id: true,
            batchCode: true,
            level: true,
            schedule: true,
            startDate: true,
            endDate: true,
            status: true,
          }
        },
        _count: {
          select: {
            batches: true,
          },
        },
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(teacher)
  } catch (error) {
    console.error('Error fetching teacher:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teacher' },
      { status: 500 }
    )
  }
}

// PATCH /api/teachers/[id] - Update teacher (FOUNDER only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const rateLimitResult = await limiter(req)
    if (rateLimitResult) return rateLimitResult

    const check = await checkPermission('teachers', 'update')
    if (!check.authorized) return check.response

    const { id } = await params

    const body = await req.json()

    // Validate request
    const validation = updateTeacherSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    // Check if teacher exists
    const existingTeacher = await prisma.user.findUnique({
      where: { id: id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    })

    if (!existingTeacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      )
    }

    if (existingTeacher.role !== 'TEACHER') {
      return NextResponse.json(
        { error: 'User is not a teacher' },
        { status: 400 }
      )
    }

    // If email is being changed, check if new email already exists
    if (data.email && data.email !== existingTeacher.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: { id: id }
        }
      })

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        )
      }
    }

    // Build update data object (only include fields that are provided)
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.email !== undefined) updateData.email = data.email
    if (data.active !== undefined) updateData.active = data.active
    if (data.teacherLevels !== undefined) updateData.teacherLevels = data.teacherLevels
    if (data.teacherTimings !== undefined) updateData.teacherTimings = data.teacherTimings
    if (data.teacherTimeSlots !== undefined) updateData.teacherTimeSlots = data.teacherTimeSlots
    if (data.hourlyRate !== undefined) updateData.hourlyRate = data.hourlyRate
    if (data.currency !== undefined) updateData.currency = data.currency
    if (data.whatsapp !== undefined) updateData.whatsapp = data.whatsapp
    if (data.remarks !== undefined) updateData.remarks = data.remarks

    // Update teacher
    const updatedTeacher = await prisma.user.update({
      where: { id: id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        teacherLevels: true,
        teacherTimings: true,
        teacherTimeSlots: true,
        hourlyRate: true,
        currency: true,
        whatsapp: true,
        remarks: true,
        createdAt: true,
      },
    })

    // Audit log
    const changes = []
    if (data.email && data.email !== existingTeacher.email) {
      changes.push(`Email changed from ${existingTeacher.email} to ${data.email}`)
    }
    if (data.name && data.name !== existingTeacher.name) {
      changes.push(`Name changed from ${existingTeacher.name} to ${data.name}`)
    }
    
    await logSuccess(
      AuditAction.TEACHER_UPDATED,
      `Teacher updated: ${updatedTeacher.name} (${updatedTeacher.email})${changes.length > 0 ? ' - ' + changes.join(', ') : ''}`,
      {
        entityType: 'User',
        entityId: updatedTeacher.id,
        metadata: {
          teacherName: updatedTeacher.name,
          teacherEmail: updatedTeacher.email,
          changes: changes,
          oldEmail: existingTeacher.email,
          newEmail: data.email,
        },
        request: req,
      }
    )

    return NextResponse.json(updatedTeacher, { status: 200 })
  } catch (error) {
    console.error('Error updating teacher:', error)
    return NextResponse.json(
      { error: 'Failed to update teacher' },
      { status: 500 }
    )
  }
}
