import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { REFUND_POLICY } from '@/lib/pricing'

// Generate invoice number
function generateInvoiceNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0')
  return `INV-${year}${month}${day}-${time}`
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      studentId,
      paymentId,
      customItems, // Optional: custom invoice items
    } = body

    // Fetch student data
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        batch: {
          select: {
            batchCode: true,
            level: true,
            schedule: true,
          },
        },
      },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Fetch payment data if paymentId provided
    let payment = null
    if (paymentId) {
      payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      })
    }

    // Build invoice data
    const invoiceData = {
      invoiceNumber: payment?.invoiceNumber || generateInvoiceNumber(),
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      currency: student.currency || 'INR', // FIX #1: Use student's currency

      // Student info
      studentName: student.name,
      studentAddress: '', // Can be added to Student model later
      studentEmail: student.email || '',
      studentPhone: student.whatsapp,

      // Course items
      items: customItems || [
        {
          level: student.currentLevel,
          description: 'German Language Course',
          // FIX #4: Use enrollment date for month
          month: new Date(student.enrollmentDate).toLocaleString('default', {
            month: 'long',
            year: 'numeric'
          }),
          // FIX #3: Use batch code instead of schedule
          batch: student.batch?.batchCode || 'TBD',
          amount: Number(student.finalPrice),
        },
      ],

      // Payment details
      // FIX #2: Calculate proper payable amount for new invoices
      payableNow: payment
        ? Number(payment.amount)
        : Number(student.totalPaid) || Math.floor(Number(student.balance) * 0.6),
      remainingAmount: Number(student.balance),

      // Terms
      additionalNotes: REFUND_POLICY,
    }

    // Return invoice data to frontend for generation
    return NextResponse.json({
      success: true,
      invoiceData,
    })
  } catch (error) {
    console.error('Invoice generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    )
  }
}
