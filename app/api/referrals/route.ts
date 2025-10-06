import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { Prisma } from "@prisma/client"

const Decimal = Prisma.Decimal

// Validation schema for creating a referral
const createReferralSchema = z.object({
  referrerId: z.string().min(1, "Referrer ID required"),
  refereeId: z.string().min(1, "Referee ID required"),
  referralDate: z.string().optional(),
  enrollmentDate: z.string().optional(),
  payoutAmount: z.number().positive("Payout amount must be positive").max(100000, "Amount exceeds maximum").optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
})

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

    // Validate request body
    const validation = createReferralSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    // Check if referral already exists
    const existingReferral = await prisma.referral.findUnique({
      where: {
        referrerId_refereeId: {
          referrerId: data.referrerId,
          refereeId: data.refereeId,
        },
      },
    })

    if (existingReferral) {
      return NextResponse.json(
        { error: "Referral already exists" },
        { status: 400 }
      )
    }

    // Create referral with Decimal for payout amount
    const payoutAmount = new Decimal((data.payoutAmount || 2000).toString())

    const referral = await prisma.referral.create({
      data: {
        referrerId: data.referrerId,
        refereeId: data.refereeId,
        referralDate: data.referralDate ? new Date(data.referralDate) : new Date(),
        enrollmentDate: data.enrollmentDate ? new Date(data.enrollmentDate) : null,
        payoutAmount,
        notes: data.notes || null,
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
