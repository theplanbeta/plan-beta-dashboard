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

// Validation schema for updating hours
const updateHoursSchema = z.object({
  hoursWorked: z.number().positive().max(24).optional(),
  description: z.string().min(1).max(500).optional(),
  hourlyRate: z.number().positive().optional(),
})

// Validation schema for approving/rejecting hours
const approveHoursSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional(),
})

// Validation schema for marking as paid
const markPaidSchema = z.object({
  paidAmount: z.number().positive(),
  paymentNotes: z.string().optional(),
})

// GET /api/teacher-hours/[id] - Get specific hour entry
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const hourEntry = await prisma.teacherHours.findUnique({
      where: { id },
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
    })

    if (!hourEntry) {
      return NextResponse.json({ error: 'Hour entry not found' }, { status: 404 })
    }

    // Teachers can only view their own hours
    if (session.user.role === 'TEACHER' && hourEntry.teacherId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(hourEntry)
  } catch (error) {
    console.error('Error fetching hour entry:', error)
    return NextResponse.json({ error: 'Failed to fetch hour entry' }, { status: 500 })
  }
}

// PATCH /api/teacher-hours/[id] - Update hour entry or approve/reject
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const rateLimitResult = await limiter(req)
    if (rateLimitResult) return rateLimitResult

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    // Fetch existing hour entry
    const existingEntry = await prisma.teacherHours.findUnique({
      where: { id },
    })

    if (!existingEntry) {
      return NextResponse.json({ error: 'Hour entry not found' }, { status: 404 })
    }

    // Determine action type based on request body
    const isApprovalAction = 'status' in body
    const isPaymentAction = 'paidAmount' in body
    const isUpdateAction = !isApprovalAction && !isPaymentAction

    // Handle approval/rejection (FOUNDER only)
    if (isApprovalAction) {
      if (session.user.role !== 'FOUNDER') {
        return NextResponse.json(
          { error: 'Only admins can approve/reject hours' },
          { status: 403 }
        )
      }

      const validation = approveHoursSchema.safeParse(body)
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.issues },
          { status: 400 }
        )
      }

      const { status, rejectionReason } = validation.data

      if (status === 'REJECTED' && !rejectionReason) {
        return NextResponse.json(
          { error: 'Rejection reason required when rejecting hours' },
          { status: 400 }
        )
      }

      const updatedEntry = await prisma.teacherHours.update({
        where: { id },
        data: {
          status,
          approvedBy: session.user.id,
          approvedAt: new Date(),
          rejectionReason: status === 'REJECTED' ? rejectionReason : null,
        },
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
      })

      // Audit log
      await logSuccess(
        status === 'APPROVED' ? AuditAction.TEACHER_HOURS_APPROVED : AuditAction.TEACHER_HOURS_REJECTED,
        `Teacher hours ${status.toLowerCase()}: ${updatedEntry.teacher.name} - ${updatedEntry.hoursWorked}h`,
        {
          entityType: 'TeacherHours',
          entityId: updatedEntry.id,
          metadata: {
            teacherName: updatedEntry.teacher.name,
            hoursWorked: Number(updatedEntry.hoursWorked),
            totalAmount: Number(updatedEntry.totalAmount),
            status,
            rejectionReason,
            batchCode: updatedEntry.batch?.batchCode,
          },
          request: req,
        }
      )

      return NextResponse.json(updatedEntry)
    }

    // Handle payment marking (FOUNDER only)
    if (isPaymentAction) {
      if (session.user.role !== 'FOUNDER') {
        return NextResponse.json(
          { error: 'Only admins can mark hours as paid' },
          { status: 403 }
        )
      }

      if (existingEntry.status !== 'APPROVED') {
        return NextResponse.json(
          { error: 'Only approved hours can be marked as paid' },
          { status: 400 }
        )
      }

      const validation = markPaidSchema.safeParse(body)
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.issues },
          { status: 400 }
        )
      }

      const { paidAmount, paymentNotes } = validation.data

      const updatedEntry = await prisma.teacherHours.update({
        where: { id },
        data: {
          paid: true,
          paidDate: new Date(),
          paidAmount: new Decimal(paidAmount),
          paymentNotes,
        },
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
      })

      // Audit log
      await logSuccess(
        AuditAction.TEACHER_HOURS_PAID,
        `Teacher hours marked as paid: ${updatedEntry.teacher.name} - ₹${paidAmount}`,
        {
          entityType: 'TeacherHours',
          entityId: updatedEntry.id,
          metadata: {
            teacherName: updatedEntry.teacher.name,
            hoursWorked: Number(updatedEntry.hoursWorked),
            paidAmount,
            paymentNotes,
            batchCode: updatedEntry.batch?.batchCode,
          },
          request: req,
        }
      )

      return NextResponse.json(updatedEntry)
    }

    // Handle regular update (Teachers can only update PENDING hours)
    if (isUpdateAction) {
      // Teachers can only update their own pending hours
      if (session.user.role === 'TEACHER') {
        if (existingEntry.teacherId !== session.user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        if (existingEntry.status !== 'PENDING') {
          return NextResponse.json(
            { error: 'Can only update pending hours' },
            { status: 400 }
          )
        }
      } else if (session.user.role !== 'FOUNDER') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const validation = updateHoursSchema.safeParse(body)
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.issues },
          { status: 400 }
        )
      }

      const { hoursWorked, description, hourlyRate } = validation.data

      // Recalculate total if hours or rate changed
      let totalAmount = existingEntry.totalAmount
      if (hoursWorked !== undefined || hourlyRate !== undefined) {
        const newHours = new Decimal(hoursWorked ?? existingEntry.hoursWorked.toString())
        const newRate = new Decimal(hourlyRate ?? existingEntry.hourlyRate?.toString() ?? '0')
        totalAmount = newHours.times(newRate)
      }

      const updatedEntry = await prisma.teacherHours.update({
        where: { id },
        data: {
          ...(hoursWorked !== undefined && { hoursWorked: new Decimal(hoursWorked) }),
          ...(description !== undefined && { description }),
          ...(hourlyRate !== undefined && { hourlyRate: new Decimal(hourlyRate) }),
          totalAmount,
        },
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
      })

      return NextResponse.json(updatedEntry)
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Error updating hour entry:', error)
    return NextResponse.json({ error: 'Failed to update hour entry' }, { status: 500 })
  }
}

// DELETE /api/teacher-hours/[id] - Delete hour entry (PENDING only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const hourEntry = await prisma.teacherHours.findUnique({
      where: { id },
    })

    if (!hourEntry) {
      return NextResponse.json({ error: 'Hour entry not found' }, { status: 404 })
    }

    // Teachers can only delete their own pending hours
    if (session.user.role === 'TEACHER') {
      if (hourEntry.teacherId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      if (hourEntry.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Can only delete pending hours' },
          { status: 400 }
        )
      }
    } else if (session.user.role !== 'FOUNDER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.teacherHours.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Hour entry deleted' })
  } catch (error) {
    console.error('Error deleting hour entry:', error)
    return NextResponse.json({ error: 'Failed to delete hour entry' }, { status: 500 })
  }
}
