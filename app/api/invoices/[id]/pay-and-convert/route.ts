import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logSuccess, logError, logCritical } from '@/lib/audit'
import { AuditAction, Prisma } from '@prisma/client'
import { z } from 'zod'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const limiter = rateLimit(RATE_LIMITS.STRICT)
const Decimal = Prisma.Decimal

// Validation schema
const payAndConvertSchema = z.object({
  paidAmount: z.number().positive('Paid amount must be positive').max(100000, 'Amount exceeds maximum'),
  batchId: z.string().optional(),
  enrollmentType: z.enum(['A1_ONLY', 'A1_TO_B1', 'A1_TO_B2']).optional(),
  idempotencyKey: z.string().min(1, 'Idempotency key required'),
})

// Generate student ID
function generateStudentId(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const count = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')
  return `STU${year}${month}${count}`
}

// POST /api/invoices/[id]/pay-and-convert - Mark invoice as paid and convert lead to student
export async function POST(
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

    // Validate request body
    const validation = payAndConvertSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { paidAmount, batchId, enrollmentType, idempotencyKey } = validation.data

    // Fetch invoice with lead
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        lead: true,
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (!invoice.lead) {
      return NextResponse.json(
        { error: 'Invoice has no associated lead' },
        { status: 400 }
      )
    }

    // Check for existing conversion attempt with same idempotency key
    const existingAttempt = await prisma.conversionAttempt.findUnique({
      where: { idempotencyKey },
    })

    if (existingAttempt) {
      if (existingAttempt.status === 'COMPLETED' && existingAttempt.result) {
        // Return cached result for completed conversion
        return NextResponse.json(existingAttempt.result)
      } else if (existingAttempt.status === 'PENDING') {
        // Another request is processing this conversion
        return NextResponse.json(
          {
            error: 'Conversion in progress',
            message: 'Another request is currently processing this conversion. Please wait.',
          },
          { status: 409 } // Conflict
        )
      } else if (existingAttempt.status === 'FAILED') {
        // Previous attempt failed, allow retry
        // Delete failed attempt to allow new one
        await prisma.conversionAttempt.delete({
          where: { id: existingAttempt.id },
        })
      }
    }

    // Create conversion attempt record (acts as distributed lock)
    let conversionAttempt
    try {
      conversionAttempt = await prisma.conversionAttempt.create({
        data: {
          idempotencyKey,
          invoiceId: id,
          leadId: invoice.lead!.id,
          paidAmount,
          currency: invoice.currency,
          batchId,
          enrollmentType,
          status: 'PENDING',
          userId: session.user.id,
          userEmail: session.user.email || null,
        },
      })
    } catch (error: any) {
      // Unique constraint violation - concurrent request
      if (error.code === 'P2002') {
        return NextResponse.json(
          {
            error: 'Duplicate conversion attempt',
            message: 'A conversion with this idempotency key is already in progress.',
          },
          { status: 409 }
        )
      }
      throw error
    }

    // Cross-field validation: paidAmount vs invoice total
    const invoiceTotal = new Decimal(invoice.totalAmount.toString())
    const paidAmountDecimal = new Decimal(paidAmount)

    if (paidAmountDecimal.greaterThan(invoiceTotal)) {
      return NextResponse.json(
        {
          error: 'Paid amount exceeds invoice total',
          details: {
            paidAmount,
            invoiceTotal: invoiceTotal.toNumber(),
            excess: paidAmountDecimal.minus(invoiceTotal).toNumber()
          }
        },
        { status: 400 }
      )
    }

    if (paidAmountDecimal.lessThanOrEqualTo(0)) {
      return NextResponse.json({ error: 'Paid amount must be greater than zero' }, { status: 400 })
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Log start of conversion process with idempotency key
      await logSuccess(
        AuditAction.LEAD_TO_STUDENT_CONVERSION,
        `Starting conversion: Lead ${invoice.lead!.name} → Student (Payment: ${getCurrencySymbol(invoice.currency)}${paidAmount})`,
        {
          entityType: 'Invoice',
          entityId: invoice.id,
          metadata: {
            leadId: invoice.lead!.id,
            leadName: invoice.lead!.name,
            invoiceNumber: invoice.invoiceNumber,
            paidAmount,
            currency: invoice.currency,
            idempotencyKey,
          },
          request: req,
        }
      )
      // 1. Update invoice status - Use Decimal for precision
      const totalAmount = new Decimal(invoice.totalAmount.toString())
      const paidAmountDecimal = new Decimal(paidAmount)
      const remainingAmount = totalAmount.minus(paidAmountDecimal)

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'PAID',
          paidAmount: paidAmountDecimal,
          remainingAmount: remainingAmount,
        },
      })

      // 2. Generate student ID
      const studentId = generateStudentId()

      // 3. Calculate pricing from invoice - Use Decimal for precision
      const finalPrice = totalAmount
      const balance = finalPrice.minus(paidAmountDecimal)

      // 4. Create student from lead data
      const student = await tx.student.create({
        data: {
          studentId,
          name: invoice.lead!.name,
          whatsapp: invoice.lead!.whatsapp,
          email: invoice.lead!.email || null,
          enrollmentDate: new Date(),
          currentLevel: invoice.lead!.interestedLevel || 'NEW',
          enrollmentType: enrollmentType || invoice.lead!.interestedType || 'A1_ONLY',
          batchId: batchId || invoice.lead!.batchId || null,
          originalPrice: finalPrice,
          discountApplied: 0,
          finalPrice: finalPrice,
          currency: invoice.currency,
          paymentStatus: balance.greaterThan(0) ? 'PARTIAL' : 'PAID',
          totalPaid: paidAmountDecimal,
          balance: balance,
          referralSource: invoice.lead!.source,
          trialAttended: invoice.lead!.trialAttendedDate !== null,
          trialDate: invoice.lead!.trialAttendedDate,
        },
      })

      // 5. Update lead as converted
      const updatedLead = await tx.lead.update({
        where: { id: invoice.lead!.id },
        data: {
          converted: true,
          convertedDate: new Date(),
          studentId: student.id,
          status: 'CONVERTED',
        },
      })

      // 6. Link invoice to student
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          studentId: student.id,
        },
      })

      // 7. Create payment record
      const payment = await tx.payment.create({
        data: {
          studentId: student.id,
          amount: paidAmount,
          paymentDate: new Date(),
          method: 'BANK_TRANSFER', // Default, can be customized
          status: 'COMPLETED',
          currency: invoice.currency,
          invoiceNumber: invoice.invoiceNumber,
        },
      })

      // 8. Update batch enrollment count if batch assigned
      if (batchId || invoice.lead!.batchId) {
        const targetBatchId = batchId || invoice.lead!.batchId!
        await tx.batch.update({
          where: { id: targetBatchId },
          data: {
            enrolledCount: { increment: 1 },
          },
        })
      }

      return {
        student,
        invoice: updatedInvoice,
        lead: updatedLead,
        payment,
      }
    })

    // Audit logs for successful conversion
    await logSuccess(
      AuditAction.PAYMENT_RECEIVED,
      `Payment received: ${getCurrencySymbol(result.invoice.currency)}${paidAmount} for invoice ${result.invoice.invoiceNumber}`,
      {
        entityType: 'Payment',
        entityId: result.payment.id,
        metadata: {
          invoiceId: result.invoice.id,
          invoiceNumber: result.invoice.invoiceNumber,
          amount: paidAmount,
          currency: result.invoice.currency,
        },
        request: req,
      }
    )

    await logSuccess(
      AuditAction.STUDENT_CREATED,
      `Student created: ${result.student.studentId} - ${result.student.name}`,
      {
        entityType: 'Student',
        entityId: result.student.id,
        metadata: {
          studentId: result.student.studentId,
          studentName: result.student.name,
          enrollmentType: result.student.enrollmentType,
          finalPrice: Number(result.student.finalPrice),
          currency: result.student.currency,
        },
        request: req,
      }
    )

    await logSuccess(
      AuditAction.LEAD_CONVERTED,
      `Lead converted successfully: ${result.lead.name} → Student ${result.student.studentId}`,
      {
        entityType: 'Lead',
        entityId: result.lead.id,
        metadata: {
          leadId: result.lead.id,
          leadName: result.lead.name,
          studentId: result.student.id,
          studentCode: result.student.studentId,
          invoiceNumber: result.invoice.invoiceNumber,
          idempotencyKey,
        },
        request: req,
      }
    )

    // Prepare response
    const response = {
      success: true,
      message: 'Lead converted to student successfully',
      student: result.student,
      studentId: result.student.studentId,
      invoiceStatus: result.invoice.status,
    }

    // Mark conversion attempt as completed
    await prisma.conversionAttempt.update({
      where: { id: conversionAttempt.id },
      data: {
        status: 'COMPLETED',
        studentId: result.student.id,
        result: response, // Cache response for idempotent retrieval
      },
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Pay and convert error:', error)

    // Mark conversion attempt as FAILED if it exists
    if (conversionAttempt) {
      try {
        await prisma.conversionAttempt.update({
          where: { id: conversionAttempt.id },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        })
      } catch (updateError) {
        console.error('Failed to update conversion attempt status:', updateError)
      }
    }

    // Critical error log - this is a high-value transaction failure
    await logCritical(
      AuditAction.API_ERROR,
      `CRITICAL: Failed to convert lead to student for invoice ${id}`,
      error as Error,
      {
        entityType: 'Invoice',
        entityId: id,
        metadata: {
          attemptedPaidAmount: paidAmount,
          batchId,
          enrollmentType,
        },
        request: req,
      }
    )

    return NextResponse.json(
      { error: 'Failed to convert lead' },
      { status: 500 }
    )
  }
}

function getCurrencySymbol(currency: string): string {
  return currency === 'EUR' ? '€' : '₹'
}
