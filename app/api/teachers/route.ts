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
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  bio: z.string().optional(),
  qualifications: z.string().optional(),
  experience: z.string().optional(),
  specializations: z.string().optional(),
  languages: z.string().optional(),
  availability: z.string().optional(),
  hourlyRate: z.number().optional(),
  preferredContact: z.string().optional(),
  whatsapp: z.string().optional(),
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
        email: true,
        name: true,
        phone: true,
        active: true,
        bio: true,
        qualifications: true,
        experience: true,
        specializations: true,
        languages: true,
        availability: true,
        hourlyRate: true,
        preferredContact: true,
        whatsapp: true,
        createdAt: true,
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

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await hash(data.password, 10)

    // Create teacher
    const teacher = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: 'TEACHER',
        phone: data.phone,
        bio: data.bio,
        qualifications: data.qualifications,
        experience: data.experience,
        specializations: data.specializations,
        languages: data.languages,
        availability: data.availability,
        hourlyRate: data.hourlyRate,
        preferredContact: data.preferredContact,
        whatsapp: data.whatsapp,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        active: true,
        bio: true,
        qualifications: true,
        experience: true,
        specializations: true,
        languages: true,
        availability: true,
        hourlyRate: true,
        preferredContact: true,
        whatsapp: true,
        createdAt: true,
      },
    })

    // Audit log
    await logSuccess(
      AuditAction.TEACHER_CREATED,
      `Teacher created: ${teacher.name} (${teacher.email})`,
      {
        entityType: 'User',
        entityId: teacher.id,
        metadata: {
          teacherName: teacher.name,
          teacherEmail: teacher.email,
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
