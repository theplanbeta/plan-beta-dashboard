import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/payments/[id] - Get single payment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            name: true,
            whatsapp: true,
            email: true,
            finalPrice: true,
            totalPaid: true,
            balance: true,
            batch: {
              select: {
                id: true,
                batchCode: true,
              },
            },
          },
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error("Error fetching payment:", error)
    return NextResponse.json(
      { error: "Failed to fetch payment" },
      { status: 500 }
    )
  }
}

// PUT /api/payments/[id] - Update payment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const body = await request.json()

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        amount: body.amount,
        method: body.method,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : undefined,
        status: body.status,
        transactionId: body.transactionId || null,
        notes: body.notes || null,
      },
      include: {
        student: true,
      },
    })

    // Update student payment status
    await updateStudentPaymentStatus(payment.studentId)

    return NextResponse.json(payment)
  } catch (error) {
    console.error("Error updating payment:", error)
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    )
  }
}

// DELETE /api/payments/[id] - Delete payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const payment = await prisma.payment.findUnique({
      where: { id },
    })

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    await prisma.payment.delete({
      where: { id },
    })

    // Update student payment status
    await updateStudentPaymentStatus(payment.studentId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting payment:", error)
    return NextResponse.json(
      { error: "Failed to delete payment" },
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
      },
    },
  })

  if (!student) return

  const totalPaid = student.payments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0
  )
  const balance = Number(student.finalPrice) - totalPaid

  let paymentStatus: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" = "PENDING"

  if (totalPaid === 0) {
    paymentStatus = "PENDING"
  } else if (totalPaid >= Number(student.finalPrice)) {
    paymentStatus = "PAID"
  } else {
    paymentStatus = "PARTIAL"
  }

  // Check if overdue (payment pending for more than 30 days after enrollment)
  const daysSinceEnrollment = Math.floor(
    (new Date().getTime() - new Date(student.enrollmentDate).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (balance > 0 && daysSinceEnrollment > 30) {
    paymentStatus = "OVERDUE"
  }

  await prisma.student.update({
    where: { id: studentId },
    data: {
      totalPaid,
      balance,
      paymentStatus,
    },
  })
}
