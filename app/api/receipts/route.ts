import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateReceiptNumber } from '@/lib/receipt-storage'
import { createAuditLog } from '@/lib/audit'
import { gzipSync } from 'zlib'

// POST /api/receipts - Generate and store receipt
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await req.json()
    const { paymentId, pdfBase64, jpgBase64 } = body

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 })
    }

    if (!pdfBase64 && !jpgBase64) {
      return NextResponse.json(
        { error: 'At least one file format (PDF or JPG) is required' },
        { status: 400 }
      )
    }

    // Fetch payment with student and batch info
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        student: {
          include: {
            batch: true,
          },
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Check if receipt already exists for this payment
    const existingReceipt = await prisma.receipt.findFirst({
      where: { paymentId },
    })

    if (existingReceipt) {
      return NextResponse.json(
        {
          error: 'Receipt already exists for this payment',
          receiptId: existingReceipt.id,
          receiptNumber: existingReceipt.receiptNumber,
        },
        { status: 409 }
      )
    }

    // Generate unique receipt number
    const receiptNumber = generateReceiptNumber()

    // Process PDF file if provided - store compressed data in database
    let pdfData: Buffer | null = null
    let pdfSize: number | null = null
    if (pdfBase64) {
      const pdfBuffer = Buffer.from(pdfBase64, 'base64')
      // Compress the PDF data
      pdfData = gzipSync(pdfBuffer, { level: 9 })
      pdfSize = pdfData.length
      console.log(`PDF: Original ${(pdfBuffer.length / 1024).toFixed(2)} KB, Compressed ${(pdfSize / 1024).toFixed(2)} KB`)
    }

    // Process JPG file if provided - store compressed data in database
    let jpgData: Buffer | null = null
    let jpgSize: number | null = null
    if (jpgBase64) {
      const jpgBuffer = Buffer.from(jpgBase64, 'base64')
      // Compress the JPG data
      jpgData = gzipSync(jpgBuffer, { level: 9 })
      jpgSize = jpgData.length
      console.log(`JPG: Original ${(jpgBuffer.length / 1024).toFixed(2)} KB, Compressed ${(jpgSize / 1024).toFixed(2)} KB`)
    }

    // Prepare course items for storage
    const courseItems = {
      level: payment.student.currentLevel,
      description: `German Language Course - ${payment.student.currentLevel} Level`,
      month: payment.student.batch?.batchCode?.split('-')[0] || 'N/A',
      batch: payment.student.batch?.batchCode || 'N/A',
      amount: Number(payment.student.finalPrice),
    }

    // Create receipt record in database with compressed file data
    const receipt = await prisma.receipt.create({
      data: {
        receiptNumber,
        paymentId: payment.id,
        studentId: payment.studentId,
        date: payment.paymentDate,
        currency: payment.currency,
        amountPaid: payment.amount,
        totalAmount: payment.student.finalPrice,
        balanceRemaining: payment.student.balance,
        paymentMethod: payment.method,
        transactionRef: payment.transactionId,
        invoiceNumber: payment.invoiceNumber,
        courseItems,
        pdfData,
        jpgData,
        pdfSize,
        jpgSize,
      },
    })

    // Log audit action
    await createAuditLog({
      action: 'RECEIPT_GENERATED',
      description: `Generated receipt ${receiptNumber} for payment ${payment.id}`,
      entityType: 'Receipt',
      entityId: receipt.id,
      metadata: {
        receiptNumber: receipt.receiptNumber,
        paymentId: payment.id,
        studentId: payment.studentId,
        amountPaid: Number(payment.amount),
        hasPdf: !!pdfData,
        hasJpg: !!jpgData,
      },
      request: req,
    })

    return NextResponse.json({
      success: true,
      receipt: {
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        date: receipt.date,
        amountPaid: receipt.amountPaid,
        hasPdf: !!pdfData,
        hasJpg: !!jpgData,
      },
    })
  } catch (error) {
    console.error('Error generating receipt:', error)
    return NextResponse.json(
      { error: 'Failed to generate receipt' },
      { status: 500 }
    )
  }
}

// GET /api/receipts - List receipts (with filters)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const paymentId = searchParams.get('paymentId')
    const studentId = searchParams.get('studentId')

    const where: any = {}
    if (paymentId) where.paymentId = paymentId
    if (studentId) where.studentId = studentId

    const receipts = await prisma.receipt.findMany({
      where,
      include: {
        payment: {
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(receipts)
  } catch (error) {
    console.error('Error fetching receipts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch receipts' },
      { status: 500 }
    )
  }
}
