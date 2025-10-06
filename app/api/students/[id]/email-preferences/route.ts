import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/students/[id]/email-preferences - Get email preferences
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
      select: {
        emailNotifications: true,
        emailWelcome: true,
        emailPayment: true,
        emailAttendance: true,
        emailBatch: true,
        emailReferral: true,
      },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    return NextResponse.json(student)
  } catch (error) {
    console.error("Error fetching email preferences:", error)
    return NextResponse.json(
      { error: "Failed to fetch email preferences" },
      { status: 500 }
    )
  }
}

// PUT /api/students/[id]/email-preferences - Update email preferences
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

    const student = await prisma.student.update({
      where: { id },
      data: {
        emailNotifications: body.emailNotifications,
        emailWelcome: body.emailWelcome,
        emailPayment: body.emailPayment,
        emailAttendance: body.emailAttendance,
        emailBatch: body.emailBatch,
        emailReferral: body.emailReferral,
      },
      select: {
        emailNotifications: true,
        emailWelcome: true,
        emailPayment: true,
        emailAttendance: true,
        emailBatch: true,
        emailReferral: true,
      },
    })

    return NextResponse.json(student)
  } catch (error) {
    console.error("Error updating email preferences:", error)
    return NextResponse.json(
      { error: "Failed to update email preferences" },
      { status: 500 }
    )
  }
}
