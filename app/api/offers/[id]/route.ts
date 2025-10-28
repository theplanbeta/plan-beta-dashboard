import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission } from '@/lib/api-permissions'
import { z } from 'zod'
import { logSuccess } from '@/lib/audit'
import { AuditAction } from '@prisma/client'

const batchAssignmentSchema = z.object({
  level: z.string().min(1, 'Level is required'),
  rate: z.number().positive('Rate must be positive'),
})

const updateOfferLetterSchema = z.object({
  teacherAddress: z.string().optional(),
  offerDate: z.string().optional(),
  acceptanceDeadline: z.string().optional(),
  positionType: z.enum(['PART_TIME', 'FULL_TIME']).optional(),
  batchAssignments: z.array(batchAssignmentSchema).optional(),
  status: z
    .enum(['DRAFT', 'GENERATED', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED'])
    .optional(),
  notes: z.string().optional(),
})

// GET /api/offers/[id] - Get specific offer letter
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const check = await checkPermission('offers', 'read')
    if (!check.authorized) return check.response

    const { id } = await params

    const offerLetter = await prisma.offerLetter.findUnique({
      where: { id },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            whatsapp: true,
          },
        },
      },
    })

    if (!offerLetter) {
      return NextResponse.json({ error: 'Offer letter not found' }, { status: 404 })
    }

    return NextResponse.json(offerLetter)
  } catch (error) {
    console.error('Error fetching offer letter:', error)
    return NextResponse.json({ error: 'Failed to fetch offer letter' }, { status: 500 })
  }
}

// PATCH /api/offers/[id] - Update offer letter
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const check = await checkPermission('offers', 'update')
    if (!check.authorized) return check.response

    const { id } = await params
    const body = await req.json()

    // Validate request
    const validation = updateOfferLetterSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    // Check if offer exists
    const existingOffer = await prisma.offerLetter.findUnique({
      where: { id },
      include: {
        teacher: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    if (!existingOffer) {
      return NextResponse.json({ error: 'Offer letter not found' }, { status: 404 })
    }

    // Update offer letter
    const updatedOffer = await prisma.offerLetter.update({
      where: { id },
      data: {
        ...(data.teacherAddress && { teacherAddress: data.teacherAddress }),
        ...(data.offerDate && { offerDate: new Date(data.offerDate) }),
        ...(data.acceptanceDeadline && { acceptanceDeadline: new Date(data.acceptanceDeadline) }),
        ...(data.positionType && { positionType: data.positionType }),
        ...(data.batchAssignments && { batchAssignments: data.batchAssignments }),
        ...(data.status && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
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
      AuditAction.TEACHER_UPDATED,
      `Offer letter updated: ${existingOffer.offerNumber} for ${existingOffer.teacher.name}`,
      {
        entityType: 'OfferLetter',
        entityId: updatedOffer.id,
        metadata: {
          offerNumber: existingOffer.offerNumber,
          teacherName: existingOffer.teacher.name,
          changes: data,
        },
        request: req,
      }
    )

    return NextResponse.json(updatedOffer)
  } catch (error) {
    console.error('Error updating offer letter:', error)
    return NextResponse.json({ error: 'Failed to update offer letter' }, { status: 500 })
  }
}

// DELETE /api/offers/[id] - Delete offer letter
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const check = await checkPermission('offers', 'delete')
    if (!check.authorized) return check.response

    const { id } = await params

    // Check if offer exists
    const existingOffer = await prisma.offerLetter.findUnique({
      where: { id },
      include: {
        teacher: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    if (!existingOffer) {
      return NextResponse.json({ error: 'Offer letter not found' }, { status: 404 })
    }

    // Only allow deletion of DRAFT or REJECTED offers
    if (!['DRAFT', 'REJECTED'].includes(existingOffer.status)) {
      return NextResponse.json(
        {
          error: `Cannot delete offer letter with status ${existingOffer.status}. Only DRAFT or REJECTED offers can be deleted.`,
        },
        { status: 400 }
      )
    }

    // Delete offer letter
    await prisma.offerLetter.delete({
      where: { id },
    })

    // Audit log
    await logSuccess(
      AuditAction.TEACHER_UPDATED,
      `Offer letter deleted: ${existingOffer.offerNumber} for ${existingOffer.teacher.name}`,
      {
        entityType: 'OfferLetter',
        entityId: existingOffer.id,
        metadata: {
          offerNumber: existingOffer.offerNumber,
          teacherName: existingOffer.teacher.name,
          status: existingOffer.status,
        },
        request: req,
      }
    )

    return NextResponse.json({ success: true, message: 'Offer letter deleted' })
  } catch (error) {
    console.error('Error deleting offer letter:', error)
    return NextResponse.json({ error: 'Failed to delete offer letter' }, { status: 500 })
  }
}
