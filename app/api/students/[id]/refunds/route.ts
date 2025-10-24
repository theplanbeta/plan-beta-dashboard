import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"
import { Prisma } from "@prisma/client"
import { getEurEquivalent, EXCHANGE_RATE } from "@/lib/pricing"

const Decimal = Prisma.Decimal

const refundSchema = z.object({
  refundAmount: z.number().min(0.01, "Refund amount must be greater than 0"),
  paymentId: z.string().optional(),
  refundMethod: z.enum(["BANK_TRANSFER", "UPI", "CASH", "CARD", "OTHER"]),
  refundReason: z.enum([
    "STUDENT_WITHDRAWAL",
    "OVERPAYMENT",
    "SERVICE_ISSUE",
    "DUPLICATE_PAYMENT",
    "BATCH_CANCELLED",
    "OTHER",
  ]),
  transactionId: z.string().optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const check = await checkPermission("students", "read")
    if (!check.authorized) return check.response

    const { id } = await params

    const refunds = await prisma.refund.findMany({
      where: { studentId: id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(refunds)
  } catch (error) {
    console.error("Error fetching student refunds:", error)
    return NextResponse.json(
      { error: "Failed to load refunds" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const check = await checkPermission("students", "update")
    if (!check.authorized) return check.response

    const { id } = await params
    const body = await request.json()

    const validation = refundSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    // Fetch student with current payment details
    const student = await prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        studentId: true,
        name: true,
        totalPaid: true,
        totalPaidEur: true,
        balance: true,
        finalPrice: true,
        currency: true,
        eurEquivalent: true,
        exchangeRateUsed: true,
      },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Validate refund amount
    const refundAmount = new Decimal(data.refundAmount.toString())
    const currentTotalPaid = student.totalPaid

    if (refundAmount.greaterThan(currentTotalPaid)) {
      return NextResponse.json(
        {
          error: "Refund amount cannot exceed total paid",
          details: `Maximum refundable amount: ${currentTotalPaid.toString()} ${student.currency}`,
        },
        { status: 400 }
      )
    }

    // Fetch the user's name from the database
    const { user } = check.session
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true },
    })

    // Calculate new payment totals
    const newTotalPaid = currentTotalPaid.minus(refundAmount)
    const newBalance = student.finalPrice.minus(newTotalPaid)

    // Calculate EUR equivalent for the refund
    const refundAmountEur = new Decimal(
      getEurEquivalent(Number(refundAmount), student.currency as "EUR" | "INR").toFixed(2)
    )
    const newTotalPaidEur = (student.totalPaidEur || new Decimal(0)).minus(refundAmountEur)

    // Determine new payment status
    let newPaymentStatus: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE"
    if (newBalance.equals(0)) {
      newPaymentStatus = "PAID"
    } else if (newBalance.equals(student.finalPrice)) {
      newPaymentStatus = "PENDING"
    } else {
      newPaymentStatus = "PARTIAL"
    }

    console.log(`[Refund Processing] Student ${student.studentId}:`)
    console.log(`  - Refund Amount: ${refundAmount.toString()} ${student.currency}`)
    console.log(`  - Current Total Paid: ${currentTotalPaid.toString()}`)
    console.log(`  - New Total Paid: ${newTotalPaid.toString()}`)
    console.log(`  - New Balance: ${newBalance.toString()}`)
    console.log(`  - New Payment Status: ${newPaymentStatus}`)

    // Process refund in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create refund record
      const refund = await tx.refund.create({
        data: {
          studentId: id,
          paymentId: data.paymentId || null,
          refundAmount,
          currency: student.currency,
          refundMethod: data.refundMethod,
          refundReason: data.refundReason,
          processedByUserId: user.id,
          processedByUserName: dbUser?.name || dbUser?.email || "Unknown User",
          transactionId: data.transactionId || null,
          status: "PROCESSED",
          notes: data.notes || null,
        },
      })

      // Update student payment totals
      const updatedStudent = await tx.student.update({
        where: { id },
        data: {
          totalPaid: newTotalPaid,
          totalPaidEur: newTotalPaidEur,
          balance: newBalance,
          paymentStatus: newPaymentStatus,
        },
      })

      console.log(`[Refund Processing] Refund ${refund.id} created successfully`)

      return { refund, student: updatedStudent }
    })

    return NextResponse.json(result.refund, { status: 201 })
  } catch (error) {
    console.error("Error processing refund:", error)
    return NextResponse.json(
      { error: "Failed to process refund" },
      { status: 500 }
    )
  }
}
