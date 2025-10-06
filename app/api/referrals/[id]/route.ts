import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

// GET /api/referrals/[id] - Get single referral
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

    const referral = await prisma.referral.findUnique({
      where: { id },
      include: {
        referrer: {
          select: {
            id: true,
            studentId: true,
            name: true,
            whatsapp: true,
            email: true,
          },
        },
        referee: {
          select: {
            id: true,
            studentId: true,
            name: true,
            whatsapp: true,
            email: true,
            enrollmentDate: true,
            attendanceRate: true,
            classesAttended: true,
            totalClasses: true,
            completionStatus: true,
          },
        },
      },
    })

    if (!referral) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 })
    }

    return NextResponse.json(referral)
  } catch (error) {
    console.error("Error fetching referral:", error)
    return NextResponse.json(
      { error: "Failed to fetch referral" },
      { status: 500 }
    )
  }
}

// PUT /api/referrals/[id] - Update referral
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

    const referral = await prisma.referral.update({
      where: { id },
      data: {
        enrollmentDate: body.enrollmentDate ? new Date(body.enrollmentDate) : null,
        month1Complete: body.month1Complete,
        payoutAmount: body.payoutAmount,
        payoutStatus: body.payoutStatus,
        payoutDate: body.payoutDate ? new Date(body.payoutDate) : null,
        notes: body.notes || null,
      },
      include: {
        referrer: {
          select: {
            id: true,
            studentId: true,
            name: true,
            email: true,
            emailNotifications: true,
            emailReferral: true,
          },
        },
        referee: {
          select: {
            id: true,
            studentId: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Send payout email when status changes to PAID (if preferences allow)
    if (
      body.payoutStatus === "PAID" &&
      referral.referrer.email &&
      referral.referrer.emailNotifications &&
      referral.referrer.emailReferral
    ) {
      await sendEmail("referral-payout", {
        to: referral.referrer.email,
        referrerName: referral.referrer.name,
        refereeName: referral.referee.name,
        amount: Number(referral.payoutAmount).toFixed(2),
        payoutDate: referral.payoutDate?.toLocaleDateString() || new Date().toLocaleDateString(),
        paymentMethod: "Bank Transfer",
      })
    }

    return NextResponse.json(referral)
  } catch (error) {
    console.error("Error updating referral:", error)
    return NextResponse.json(
      { error: "Failed to update referral" },
      { status: 500 }
    )
  }
}

// DELETE /api/referrals/[id] - Delete referral
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

    await prisma.referral.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting referral:", error)
    return NextResponse.json(
      { error: "Failed to delete referral" },
      { status: 500 }
    )
  }
}
