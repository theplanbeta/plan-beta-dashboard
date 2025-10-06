import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { checkPermission } from "@/lib/api-permissions"
import { z } from "zod"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { Prisma } from "@prisma/client"

const limiter = rateLimit(RATE_LIMITS.MODERATE)
const Decimal = Prisma.Decimal

// Validation schema for payment creation
const createPaymentSchema = z.object({
  studentId: z.string().min(1, 'Student ID required'),
  amount: z.number().positive('Amount must be positive').max(100000, 'Amount exceeds maximum'),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE'], {
    errorMap: () => ({ message: 'Invalid payment method' }),
  }),
  paymentDate: z.string().datetime().optional(),
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
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const validData = validation.data

    const payment = await prisma.payment.create({
      data: {
        studentId: validData.studentId,
        amount: validData.amount,
        method: validData.method,
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

  // Use Decimal for precision
  const totalPaid = student.payments.reduce(
    (sum, payment) => sum.add(new Decimal(payment.amount.toString())),
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

  await prisma.student.update({
    where: { id: studentId },
    data: {
      totalPaid: totalPaid,
      balance: balance,
      paymentStatus,
      churnRisk,
    },
  })
}
