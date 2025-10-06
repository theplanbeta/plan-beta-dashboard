import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
        },
        referralsGiven: true,
      },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    return NextResponse.json(student)
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

    const { id } = await params

    const body = await request.json()

    // Calculate final price and balance if pricing changed
    const finalPrice = body.originalPrice - (body.discountApplied || 0)
    const balance = finalPrice - (body.totalPaid || 0)

    const student = await prisma.student.update({
      where: { id },
      data: {
        name: body.name,
        whatsapp: body.whatsapp,
        email: body.email || null,
        currentLevel: body.currentLevel,
        enrollmentType: body.enrollmentType,
        batchId: body.batchId || null,
        originalPrice: body.originalPrice,
        discountApplied: body.discountApplied || 0,
        finalPrice,
        paymentStatus: body.paymentStatus,
        totalPaid: body.totalPaid || 0,
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
