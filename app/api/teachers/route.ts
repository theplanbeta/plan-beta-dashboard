import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission } from '@/lib/api-permissions'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logSuccess } from '@/lib/audit'
import { AuditAction } from '@prisma/client'

const limiter = rateLimit(RATE_LIMITS.STANDARD)

// Validation schema for creating teacher
const createTeacherSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  teacherLevels: z.array(z.enum(['NEW', 'A1', 'A1_HYBRID', 'A1_HYBRID_MALAYALAM', 'A2', 'B1', 'B2', 'SPOKEN_GERMAN'])).optional().default([]),
  teacherTimings: z.array(z.enum(['Morning', 'Evening'])).optional().default([]),
  teacherTimeSlots: z.array(z.object({
    startTime: z.string(),
    endTime: z.string(),
  })).optional(),
  hourlyRate: z.record(z.string(), z.number()).optional(), // {"A1": 600, "B2": 750} - flexible keys
  currency: z.enum(['EUR', 'INR']).optional().default('EUR'),
  whatsapp: z.string().optional(),
  remarks: z.string().optional(),
})

// GET /api/teachers - List all teachers
export async function GET(req: NextRequest) {
  try {
    const check = await checkPermission('teachers', 'read')
    if (!check.authorized) return check.response

    const { searchParams } = new URL(req.url)
    const activeOnly = searchParams.get('active') === 'true'

    const teachers = await prisma.user.findMany({
      where: {
        role: 'TEACHER',
        ...(activeOnly && { active: true }),
      },
      select: {
        id: true,
        name: true,
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
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(teachers)
  } catch (error) {
    console.error('Error fetching teachers:', error)
    return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 })
  }
}

// POST /api/teachers - Create new teacher (FOUNDER only)
export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await limiter(req)
    if (rateLimitResult) return rateLimitResult

    const check = await checkPermission('teachers', 'create')
    if (!check.authorized) return check.response

    const body = await req.json()

    // Validate request
    const validation = createTeacherSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    // Generate unique email for teacher (name-based)
    const emailSuffix = `teacher${Date.now()}@planbeta.internal`

    // Create teacher
    const teacher = await prisma.user.create({
      data: {
        email: emailSuffix,
        name: data.name,
        password: await hash('temporary123', 10), // Temp password
        role: 'TEACHER',
        teacherLevels: data.teacherLevels,
        teacherTimings: data.teacherTimings,
        teacherTimeSlots: data.teacherTimeSlots || [],
        hourlyRate: data.hourlyRate,
        currency: data.currency,
        whatsapp: data.whatsapp,
        remarks: data.remarks,
      },
      select: {
        id: true,
        name: true,
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
    await logSuccess(
      AuditAction.TEACHER_CREATED,
      `Teacher created: ${teacher.name}`,
      {
        entityType: 'User',
        entityId: teacher.id,
        metadata: {
          teacherName: teacher.name,
          role: 'TEACHER',
        },
        request: req,
      }
    )

    return NextResponse.json(teacher, { status: 201 })
  } catch (error) {
    console.error('Error creating teacher:', error)
    return NextResponse.json({ error: 'Failed to create teacher' }, { status: 500 })
  }
}
