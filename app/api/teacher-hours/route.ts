import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logSuccess } from '@/lib/audit'
import { AuditAction } from '@prisma/client'

const Decimal = Prisma.Decimal
const limiter = rateLimit(RATE_LIMITS.STANDARD)

// Validation schema for logging hours
const logHoursSchema = z.object({
  batchId: z.string().optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  hoursWorked: z.number().positive('Hours must be positive').max(24, 'Cannot exceed 24 hours'),
  description: z.string().min(1, 'Description required').max(500, 'Description too long'),
  hourlyRate: z.number().positive('Hourly rate must be positive').optional(),
})

// POST /api/teacher-hours - Log hours (Teachers only)
export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await limiter(req)
    if (rateLimitResult) return rateLimitResult

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only teachers can log hours
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Only teachers can log hours' }, { status: 403 })
    }

    const body = await req.json()

    // Validate request
    const validation = logHoursSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { batchId, date, hoursWorked, description, hourlyRate } = validation.data

    // Get teacher's default hourly rate if not provided
    const teacher = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { hourlyRate: true },
    })

    const effectiveRate = hourlyRate || (teacher?.hourlyRate ? Number(teacher.hourlyRate) : 0)

    if (effectiveRate === 0) {
      return NextResponse.json(
        { error: 'Hourly rate not set. Please update your profile or provide a rate.' },
        { status: 400 }
      )
    }

    // Calculate total amount
    const hoursWorkedDecimal = new Decimal(hoursWorked)
    const hourlyRateDecimal = new Decimal(effectiveRate)
    const totalAmount = hoursWorkedDecimal.times(hourlyRateDecimal)

    // Verify batch exists and belongs to teacher (if provided)
    if (batchId) {
      const batch = await prisma.batch.findUnique({
        where: { id: batchId },
        select: { teacherId: true },
      })

      if (!batch) {
        return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
      }

      if (batch.teacherId !== session.user.id) {
        return NextResponse.json(
          { error: 'You can only log hours for your assigned batches' },
          { status: 403 }
        )
      }
    }

    // Create hour entry
    const hourEntry = await prisma.teacherHours.create({
      data: {
        teacherId: session.user.id,
        batchId: batchId || null,
        date: new Date(date),
        hoursWorked: hoursWorkedDecimal,
        description,
        hourlyRate: hourlyRateDecimal,
        totalAmount,
        status: 'PENDING',
      },
      include: {
        batch: {
          select: {
            batchCode: true,
            level: true,
          },
        },
        teacher: {
          select: {
            name: true,
          },
        },
      },
    })

    // Audit log
    await logSuccess(
      AuditAction.TEACHER_HOURS_LOGGED,
      `Teacher logged hours: ${session.user.name} - ${hoursWorked}h`,
      {
        entityType: 'TeacherHours',
        entityId: hourEntry.id,
        metadata: {
          teacherName: session.user.name,
          hoursWorked,
          totalAmount: totalAmount.toNumber(),
          batchCode: hourEntry.batch?.batchCode,
          date,
        },
        request: req,
      }
    )

    return NextResponse.json(hourEntry, { status: 201 })
  } catch (error) {
    console.error('Error logging hours:', error)
    return NextResponse.json({ error: 'Failed to log hours' }, { status: 500 })
  }
}

// GET /api/teacher-hours - List hours with filters
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const teacherId = searchParams.get('teacherId')
    const batchId = searchParams.get('batchId')
    const status = searchParams.get('status')
    const paid = searchParams.get('paid')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Permission check
    const isTeacher = session.user.role === 'TEACHER'
    const isFounder = session.user.role === 'FOUNDER'

    // Teachers can only view their own hours, Founders can view all
    if (isTeacher && teacherId && teacherId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!isTeacher && !isFounder) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build filter
    const where: any = {}

    // Teachers automatically filtered to their own hours
    if (isTeacher) {
      where.teacherId = session.user.id
    } else if (teacherId) {
      // Founders can filter by specific teacher
      where.teacherId = teacherId
    }

    if (batchId) {
      where.batchId = batchId
    }

    if (status) {
      where.status = status
    }

    if (paid !== null && paid !== undefined) {
      where.paid = paid === 'true'
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        where.date.gte = new Date(startDate)
      }
      if (endDate) {
        where.date.lte = new Date(endDate)
      }
    }

    const hours = await prisma.teacherHours.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchCode: true,
            level: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    return NextResponse.json(hours)
  } catch (error) {
    console.error('Error fetching hours:', error)
    return NextResponse.json({ error: 'Failed to fetch hours' }, { status: 500 })
  }
}
