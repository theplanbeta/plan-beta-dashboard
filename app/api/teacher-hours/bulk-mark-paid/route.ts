import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission } from '@/lib/api-permissions'
import { logSuccess } from '@/lib/audit'
import { AuditAction } from '@prisma/client'

// POST /api/teacher-hours/bulk-mark-paid - Mark all unpaid approved hours for a teacher in a period as paid
export async function POST(request: NextRequest) {
  try {
    const check = await checkPermission('teacherHours', 'update')
    if (!check.authorized) return check.response

    const body = await request.json()
    const { teacherId, startDate, endDate, paidDate, paymentMethod, transactionId, paymentNotes } = body

    if (!teacherId || !startDate || !endDate || !paidDate) {
      return NextResponse.json(
        { error: 'Missing required fields: teacherId, startDate, endDate, paidDate' },
        { status: 400 }
      )
    }

    // Get teacher info
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      select: { id: true, name: true, email: true },
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // Find all approved, unpaid hours for this teacher in the date range
    const unpaidHours = await prisma.teacherHours.findMany({
      where: {
        teacherId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        status: 'APPROVED',
        paid: false,
      },
      select: {
        id: true,
        hoursWorked: true,
        hourlyRate: true,
        totalAmount: true,
      },
    })

    if (unpaidHours.length === 0) {
      return NextResponse.json(
        { error: 'No unpaid approved hours found for this teacher in the specified period' },
        { status: 404 }
      )
    }

    // Calculate total amount
    const totalAmount = unpaidHours.reduce(
      (sum, entry) => sum + Number(entry.totalAmount),
      0
    )
    const totalHours = unpaidHours.reduce(
      (sum, entry) => sum + Number(entry.hoursWorked),
      0
    )

    // Prepare payment notes with method and transaction ID
    let fullPaymentNotes = `Payment Method: ${paymentMethod}`
    if (transactionId) {
      fullPaymentNotes += ` | Transaction ID: ${transactionId}`
    }
    if (paymentNotes) {
      fullPaymentNotes += ` | ${paymentNotes}`
    }

    // Update all entries atomically using a transaction
    // This ensures all-or-nothing: if any update fails, all are rolled back
    const updateCount = await prisma.$transaction(async (tx) => {
      const paidDateObj = new Date(paidDate)

      for (const entry of unpaidHours) {
        await tx.teacherHours.update({
          where: { id: entry.id },
          data: {
            paid: true,
            paidDate: paidDateObj,
            paidAmount: entry.totalAmount,
            paymentNotes: fullPaymentNotes,
          },
        })
      }

      return unpaidHours.length
    })

    const result = { count: updateCount }

    // Audit log
    await logSuccess(
      AuditAction.TEACHER_UPDATED,
      `Bulk marked ${result.count} hour entries as paid for ${teacher.name} (Total: INR ${totalAmount.toFixed(2)}, ${totalHours.toFixed(2)} hours)`,
      {
        entityType: 'TeacherHours',
        entityId: teacherId,
        metadata: {
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherEmail: teacher.email,
          startDate,
          endDate,
          paidDate,
          paymentMethod,
          transactionId,
          entriesCount: result.count,
          totalAmount,
          totalHours,
        },
        request,
      }
    )

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      totalAmount,
      totalHours,
      message: `Successfully marked ${result.count} hour entries as paid`,
    })
  } catch (error) {
    console.error('Error bulk marking hours as paid:', error)
    return NextResponse.json(
      {
        error: 'Failed to mark hours as paid',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
