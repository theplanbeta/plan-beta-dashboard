import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { checkPermission } from "@/lib/api-permissions"
import { z } from "zod"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { Prisma } from "@prisma/client"
import { validateCurrencyAmount, validateCurrencyConsistency, type Currency } from "@/lib/currency-validator"
import { convertToEUR, convertToINR } from "@/lib/pricing"

const limiter = rateLimit(RATE_LIMITS.MODERATE)
const Decimal = Prisma.Decimal

// Validation schema for payment creation
const createPaymentSchema = z.object({
  studentId: z.string().min(1, 'Student ID required'),
  amount: z.number().positive('Amount must be positive').max(100000, 'Amount exceeds maximum'),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'OTHER']),
  currency: z.enum(['EUR', 'INR']).optional(),
  paymentDate: z.string().optional(), // Accept date string in YYYY-MM-DD format
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
  transactionId: z.string().optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
})

// GET /api/payments - List all payments
export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("payments", "read")
    if (!check.authorized) return check.response

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const status = searchParams.get("status")
    const method = searchParams.get("method")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: Record<string, unknown> = {}

    if (studentId) {
      where.studentId = studentId
    }

    if (status) {
      where.status = status
    }

    if (method) {
      where.method = method
    }

    if (startDate || endDate) {
      where.paymentDate = {} as Record<string, Date>
      if (startDate) {
        (where.paymentDate as Record<string, Date>).gte = new Date(startDate)
      }
      if (endDate) {
        (where.paymentDate as Record<string, Date>).lte = new Date(endDate)
      }
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            name: true,
            whatsapp: true,
            batch: {
              select: {
                id: true,
                batchCode: true,
              },
            },
          },
        },
      },
      orderBy: {
        paymentDate: "desc",
      },
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error("Error fetching payments:", error)
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    )
  }
}

// POST /api/payments - Record a new payment
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await limiter(request)
    if (rateLimitResult) return rateLimitResult

    const check = await checkPermission("payments", "create")
    if (!check.authorized) return check.response

    const body = await request.json()

    // Validate request body
    const validation = createPaymentSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const validData = validation.data

    // Get student info for currency validation
    const student = await prisma.student.findUnique({
      where: { id: validData.studentId },
      select: { currency: true, name: true },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Validate currency and amount
    const paymentCurrency = (validData.currency || student.currency) as Currency
    const currencyValidation = validateCurrencyConsistency(
      student.currency as Currency,
      paymentCurrency,
      validData.amount
    )

    // If validation fails, return error with suggestions
    if (!currencyValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Currency validation failed',
          details: currencyValidation.errors,
          suggestedCurrency: currencyValidation.suggestedCurrency,
        },
        { status: 400 }
      )
    }

    // Log warnings if any (but allow the payment)
    if (currencyValidation.warnings.length > 0) {
      console.warn(`Payment currency warnings for ${student.name}:`, currencyValidation.warnings)
    }

    // DUPLICATE DETECTION: Check for very recent payments with same amount from same student
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000) // 1 minute window
    const recentDuplicatePayment = await prisma.payment.findFirst({
      where: {
        studentId: validData.studentId,
        amount: validData.amount,
        createdAt: {
          gte: oneMinuteAgo,
        },
      },
    })

    if (recentDuplicatePayment) {
      console.warn(`Blocked duplicate payment for student ${validData.studentId}: ${validData.amount} ${validData.currency}`)
      return NextResponse.json(
        {
          error: 'Duplicate payment detected',
          message: 'A payment with the same amount was recorded less than 1 minute ago. If this is intentional, please wait a moment and try again.',
          existingPaymentId: recentDuplicatePayment.id,
        },
        { status: 409 } // Conflict
      )
    }

    // Use Decimal for amount to ensure precision
    const amount = new Decimal(validData.amount.toString())

    const payment = await prisma.payment.create({
      data: {
        studentId: validData.studentId,
        amount,
        method: validData.method,
        currency: validData.currency || student.currency || "EUR",
        paymentDate: validData.paymentDate ? new Date(validData.paymentDate) : new Date(),
        status: validData.status || "COMPLETED",
        transactionId: validData.transactionId || null,
        notes: validData.notes || null,
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            name: true,
            email: true,
            finalPrice: true,
            totalPaid: true,
            balance: true,
          },
        },
      },
    })

    // Update student payment status
    await updateStudentPaymentStatus(validData.studentId)

    // Get updated student info
    const updatedStudent = await prisma.student.findUnique({
      where: { id: validData.studentId },
      select: {
        balance: true,
        emailNotifications: true,
        emailPayment: true,
      },
    })

    // Send payment confirmation email if preferences allow
    if (
      payment.student.email &&
      payment.status === "COMPLETED" &&
      updatedStudent?.emailNotifications &&
      updatedStudent?.emailPayment
    ) {
      await sendEmail("payment-received", {
        to: payment.student.email,
        studentName: payment.student.name,
        amount: Number(payment.amount).toFixed(2),
        method: payment.method,
        transactionId: payment.transactionId,
        paymentDate: payment.paymentDate.toLocaleDateString(),
        balance: Number(updatedStudent?.balance || 0).toFixed(2),
      })
    }

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error("Error creating payment:", error)
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    )
  }
}

// Helper function to update student payment status
async function updateStudentPaymentStatus(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      payments: {
        where: {
          status: "COMPLETED",
        },
        orderBy: {
          paymentDate: "desc",
        },
      },
    },
  })

  if (!student) return

  // Use Decimal for precision, normalizing all payments to student's currency
  const studentCurrency = (student.currency || "EUR") as "EUR" | "INR"
  const totalPaid = student.payments.reduce(
    (sum, payment) => {
      const paymentCurrency = (payment.currency || "EUR") as "EUR" | "INR"
      const amount = Number(payment.amount)
      // Convert to student's currency if different
      let normalizedAmount = amount
      if (paymentCurrency !== studentCurrency) {
        normalizedAmount = studentCurrency === "EUR"
          ? convertToEUR(amount, paymentCurrency)
          : convertToINR(amount, paymentCurrency)
      }
      return sum.add(new Decimal(normalizedAmount.toFixed(2)))
    },
    new Decimal(0)
  )
  const finalPrice = new Decimal(student.finalPrice.toString())
  const balance = finalPrice.minus(totalPaid)

  let paymentStatus: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" = "PENDING"

  if (totalPaid.isZero()) {
    paymentStatus = "PENDING"
  } else if (totalPaid.greaterThanOrEqualTo(finalPrice)) {
    paymentStatus = "PAID"
  } else {
    paymentStatus = "PARTIAL"
  }

  // Check if overdue (no payment in last 30 days and balance > 0)
  const lastPayment = student.payments[0] // Already sorted by date desc
  const daysSinceLastPayment = lastPayment
    ? Math.floor((new Date().getTime() - new Date(lastPayment.paymentDate).getTime()) / (1000 * 60 * 60 * 24))
    : Math.floor((new Date().getTime() - new Date(student.enrollmentDate).getTime()) / (1000 * 60 * 60 * 24))

  if (balance.greaterThan(0) && daysSinceLastPayment > 30) {
    paymentStatus = "OVERDUE"
  }

  // Calculate churn risk based on payment status and attendance
  let churnRisk: "LOW" | "MEDIUM" | "HIGH" = student.churnRisk

  if (Number(student.attendanceRate) < 50) {
    churnRisk = "HIGH"
  } else if (Number(student.attendanceRate) < 75 && paymentStatus === "OVERDUE") {
    churnRisk = "MEDIUM"
  } else if (Number(student.attendanceRate) < 75 || paymentStatus === "OVERDUE") {
    churnRisk = "MEDIUM"
  } else {
    churnRisk = "LOW"
  }

  // Calculate EUR equivalent for totalPaid
  const EXCHANGE_RATE = 104.5 // INR to EUR rate
  const totalPaidEur = student.currency === 'EUR'
    ? totalPaid
    : totalPaid.dividedBy(new Decimal(EXCHANGE_RATE))

  await prisma.student.update({
    where: { id: studentId },
    data: {
      totalPaid: totalPaid,
      totalPaidEur: totalPaidEur,
      balance: balance,
      paymentStatus,
      churnRisk,
    },
  })
}
