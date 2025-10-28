import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission } from '@/lib/api-permissions'
import { logSuccess } from '@/lib/audit'
import { AuditAction } from '@prisma/client'

// POST /api/offers/[id]/generate - Generate PDF for offer letter
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const check = await checkPermission('offers', 'update')
    if (!check.authorized) return check.response

    // Get offer letter
    const offerLetter = await prisma.offerLetter.findUnique({
      where: { id: params.id },
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

    if (!offerLetter) {
      return NextResponse.json({ error: 'Offer letter not found' }, { status: 404 })
    }

    // Update status to GENERATED (will generate PDF on client side)
    const updatedOffer = await prisma.offerLetter.update({
      where: { id: params.id },
      data: {
        status: 'GENERATED',
        sentAt: new Date(), // Mark as generated/sent
      },
    })

    // Audit log
    await logSuccess(
      AuditAction.TEACHER_UPDATED,
      `Offer letter PDF generated: ${offerLetter.offerNumber} for ${offerLetter.teacher.name}`,
      {
        entityType: 'OfferLetter',
        entityId: offerLetter.id,
        metadata: {
          offerNumber: offerLetter.offerNumber,
          teacherName: offerLetter.teacher.name,
          teacherEmail: offerLetter.teacher.email,
        },
        request: req,
      }
    )

    return NextResponse.json({
      success: true,
      offer: updatedOffer,
    })
  } catch (error) {
    console.error('Error generating offer letter PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
