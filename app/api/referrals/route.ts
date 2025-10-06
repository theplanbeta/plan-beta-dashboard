import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/referrals - List all referrals
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const referrerId = searchParams.get("referrerId")
    const payoutStatus = searchParams.get("payoutStatus")
    const month1Complete = searchParams.get("month1Complete")

    const where: Record<string, unknown> = {}

    if (referrerId) {
      where.referrerId = referrerId
    }

    if (payoutStatus) {
      where.payoutStatus = payoutStatus
    }

    if (month1Complete !== null && month1Complete !== undefined) {
      where.month1Complete = month1Complete === "true"
    }

    const referrals = await prisma.referral.findMany({
      where,
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
            completionStatus: true,
          },
        },
      },
      orderBy: {
        referralDate: "desc",
      },
    })

    return NextResponse.json(referrals)
  } catch (error) {
    console.error("Error fetching referrals:", error)
    return NextResponse.json(
      { error: "Failed to fetch referrals" },
      { status: 500 }
    )
  }
}

// POST /api/referrals - Create a new referral
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Check if referral already exists
    const existingReferral = await prisma.referral.findUnique({
      where: {
        referrerId_refereeId: {
          referrerId: body.referrerId,
          refereeId: body.refereeId,
        },
      },
    })

    if (existingReferral) {
      return NextResponse.json(
        { error: "Referral already exists" },
        { status: 400 }
      )
    }

    // Create referral
    const referral = await prisma.referral.create({
      data: {
        referrerId: body.referrerId,
        refereeId: body.refereeId,
        referralDate: body.referralDate ? new Date(body.referralDate) : new Date(),
        enrollmentDate: body.enrollmentDate ? new Date(body.enrollmentDate) : null,
        payoutAmount: body.payoutAmount || 2000,
        notes: body.notes || null,
      },
      include: {
        referrer: {
          select: {
            id: true,
            studentId: true,
            name: true,
          },
        },
        referee: {
          select: {
            id: true,
            studentId: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(referral, { status: 201 })
  } catch (error) {
    console.error("Error creating referral:", error)
    return NextResponse.json(
      { error: "Failed to create referral" },
      { status: 500 }
    )
  }
}
