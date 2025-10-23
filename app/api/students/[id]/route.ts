import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

const Decimal = Prisma.Decimal

// GET /api/students/[id] - Get single student
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

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        batch: true,
        attendance: {
          orderBy: { date: "desc" },
          take: 10,
        },
        payments: {
          orderBy: { paymentDate: "desc" },
          include: {
            receipts: {
              select: {
                id: true,
              },
            },
          },
        },
        referralsGiven: true,
      },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Add hasReceipt field to each payment
    const studentWithReceiptStatus = {
      ...student,
      payments: student.payments.map((payment) => ({
        ...payment,
        hasReceipt: payment.receipts && payment.receipts.length > 0,
        receipts: undefined, // Remove the receipts array from the response
      })),
    }

    return NextResponse.json(studentWithReceiptStatus)
  } catch (error) {
    console.error("Error fetching student:", error)
    return NextResponse.json(
      { error: "Failed to fetch student" },
      { status: 500 }
    )
  }
}

// PUT /api/students/[id] - Update student
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check permissions - FOUNDER and MARKETING can update students
    // TEACHER can only update students in their batches
    if (session.user.role === "TEACHER") {
      const { id } = await params

      const student = await prisma.student.findUnique({
        where: { id },
        include: {
          batch: {
            select: {
              teacherId: true,
            },
          },
        },
      })

      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }

      if (student.batch?.teacherId !== session.user.id) {
        return NextResponse.json(
          { error: "You can only update students in your batches" },
          { status: 403 }
        )
      }
    }

    const { id } = await params

    const body = await request.json()

    // Calculate final price and balance using Decimal for precision
    const originalPrice = new Decimal(body.originalPrice.toString())
    const discountApplied = new Decimal((body.discountApplied || 0).toString())
    const totalPaid = new Decimal((body.totalPaid || 0).toString())

    const finalPrice = originalPrice.minus(discountApplied)
    const balance = finalPrice.minus(totalPaid)

    const student = await prisma.student.update({
      where: { id },
      data: {
        name: body.name,
        whatsapp: body.whatsapp,
        email: body.email || null,
        currentLevel: body.currentLevel,
        isCombo: body.isCombo || false,
        comboLevels: body.comboLevels || [],
        batchId: body.batchId || null,
        originalPrice,
        discountApplied,
        finalPrice,
        paymentStatus: body.paymentStatus,
        totalPaid,
        balance,
        referralSource: body.referralSource,
        referredById: body.referredById || null,
        trialAttended: body.trialAttended,
        trialDate: body.trialDate ? new Date(body.trialDate) : null,
        completionStatus: body.completionStatus,
        notes: body.notes || null,
      },
      include: {
        batch: {
          select: {
            id: true,
            batchCode: true,
            level: true,
          },
        },
      },
    })

    return NextResponse.json(student)
  } catch (error) {
    console.error("Error updating student:", error)
    return NextResponse.json(
      { error: "Failed to update student" },
      { status: 500 }
    )
  }
}

// DELETE /api/students/[id] - Delete student
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

    await prisma.student.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting student:", error)
    return NextResponse.json(
      { error: "Failed to delete student" },
      { status: 500 }
    )
  }
}
