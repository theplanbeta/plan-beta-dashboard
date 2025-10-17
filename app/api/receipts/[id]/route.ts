import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readReceiptFile } from '@/lib/receipt-storage'
import { createAuditLog } from '@/lib/audit'

// GET /api/receipts/[id] - Get receipt details
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

    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        payment: {
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                name: true,
                email: true,
                whatsapp: true,
              },
            },
          },
        },
      },
    })

    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    return NextResponse.json(receipt)
  } catch (error) {
    console.error('Error fetching receipt:', error)
    return NextResponse.json(
      { error: 'Failed to fetch receipt' },
      { status: 500 }
    )
  }
}

// DELETE /api/receipts/[id] - Delete receipt (optional, for admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'FOUNDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Note: Files will remain in storage (intentional for audit trail)
    // Could add deleteReceiptFiles() call here if you want to delete files too
    await prisma.receipt.delete({
      where: { id },
    })

    await createAuditLog({
      action: 'RECEIPT_GENERATED', // Using closest action, could add RECEIPT_DELETED
      description: `Deleted receipt ${id}`,
      entityType: 'Receipt',
      entityId: id,
      request: req,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting receipt:', error)
    return NextResponse.json(
      { error: 'Failed to delete receipt' },
      { status: 500 }
    )
  }
}
