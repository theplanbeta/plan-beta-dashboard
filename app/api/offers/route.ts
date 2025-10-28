import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission } from '@/lib/api-permissions'
import { z } from 'zod'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logSuccess } from '@/lib/audit'
import { AuditAction } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const limiter = rateLimit(RATE_LIMITS.STANDARD)

// Validation schema for creating offer letter
const batchAssignmentSchema = z.object({
  level: z.string().min(1, 'Level is required'),
  rate: z.number().positive('Rate must be positive'),
})

const createOfferLetterSchema = z.object({
  teacherId: z.string().min(1, 'Teacher ID is required'),
  teacherAddress: z.string().min(1, 'Teacher address is required'),
  offerDate: z.string().min(1, 'Offer date is required'),
  acceptanceDeadline: z.string().min(1, 'Acceptance deadline is required'),
  positionType: z.enum(['PART_TIME', 'FULL_TIME']).default('PART_TIME'),
  batchAssignments: z.array(batchAssignmentSchema).min(1, 'At least one batch assignment is required'),
  notes: z.string().optional(),
})

// Helper function to generate offer number
async function generateOfferNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `OL-${year}`

  // Find the last offer letter for this year
  const lastOffer = await prisma.offerLetter.findFirst({
    where: {
      offerNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      offerNumber: 'desc',
    },
    select: {
      offerNumber: true,
    },
  })

  if (!lastOffer) {
    // First offer letter of the year
    return `${prefix}0001`
  }

  // Extract the number and increment
  const lastNumber = parseInt(lastOffer.offerNumber.split(prefix)[1] || '0')
  const nextNumber = lastNumber + 1

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`
}

// GET /api/offers - List all offer letters
export async function GET(req: NextRequest) {
  try {
    const check = await checkPermission('offers', 'read')
    if (!check.authorized) return check.response

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const teacherId = searchParams.get('teacherId')

    const offers = await prisma.offerLetter.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(teacherId && { teacherId }),
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(offers)
  } catch (error) {
    console.error('Error fetching offer letters:', error)
    return NextResponse.json({ error: 'Failed to fetch offer letters' }, { status: 500 })
  }
}

// POST /api/offers - Create new offer letter (FOUNDER/MARKETING only)
export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await limiter(req)
    if (rateLimitResult) return rateLimitResult

    const check = await checkPermission('offers', 'create')
    if (!check.authorized) {
      console.log('❌ Permission denied - offers.create')
      return check.response
    }
    console.log('✅ Permission granted - Role:', check.session.user.role)

    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Validate request
    const validation = createOfferLetterSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    // Verify teacher exists
    const teacher = await prisma.user.findUnique({
      where: {
        id: data.teacherId,
        role: 'TEACHER',
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // Generate offer number
    const offerNumber = await generateOfferNumber()

    // Create offer letter
    const offerLetter = await prisma.offerLetter.create({
      data: {
        offerNumber,
        teacherId: data.teacherId,
        teacherAddress: data.teacherAddress,
        offerDate: new Date(data.offerDate),
        acceptanceDeadline: new Date(data.acceptanceDeadline),
        positionType: data.positionType,
        batchAssignments: data.batchAssignments,
        status: 'DRAFT',
        createdBy: session.user.id!,
        createdByEmail: session.user.email!,
        notes: data.notes,
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Audit log
    await logSuccess(
      AuditAction.TEACHER_UPDATED, // Using TEACHER_UPDATED as we don't have OFFER_CREATED yet
      `Offer letter created: ${offerNumber} for ${teacher.name}`,
      {
        entityType: 'OfferLetter',
        entityId: offerLetter.id,
        metadata: {
          offerNumber,
          teacherName: teacher.name,
          teacherEmail: teacher.email,
          positionType: data.positionType,
        },
        request: req,
      }
    )

    return NextResponse.json(offerLetter, { status: 201 })
  } catch (error) {
    console.error('Error creating offer letter:', error)
    return NextResponse.json({ error: 'Failed to create offer letter' }, { status: 500 })
  }
}
