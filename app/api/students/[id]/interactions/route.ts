import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"

const interactionSchema = z.object({
  interactionType: z.enum(["PHONE_CALL", "WHATSAPP", "EMAIL", "IN_PERSON", "SMS", "OTHER"]),
  category: z.enum([
    "CHURN_OUTREACH",
    "PAYMENT_REMINDER",
    "ATTENDANCE_FOLLOW_UP",
    "GENERAL_CHECK_IN",
    "COMPLAINT_RESOLUTION",
    "COURSE_INQUIRY",
    "FEEDBACK_REQUEST",
    "REFERRAL_DISCUSSION",
    "OTHER"
  ]),
  notes: z.string().min(5, "Please add details about the interaction.").max(2000, "Notes too long"),
  outcome: z.string().max(500, "Outcome too long").optional(),
  followUpNeeded: z.boolean().optional(),
  followUpDate: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const check = await checkPermission("students", "read")
    if (!check.authorized) return check.response

    const { id } = await params

    const interactions = await prisma.studentInteraction.findMany({
      where: { studentId: id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(interactions)
  } catch (error) {
    console.error("Error fetching student interactions:", error)
    return NextResponse.json(
      { error: "Failed to load interactions" },
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

    const validation = interactionSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const student = await prisma.student.findUnique({
      where: { id },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const { user } = check.session

    // Fetch the user's name from the database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true },
    })

    const interaction = await prisma.studentInteraction.create({
      data: {
        studentId: id,
        userId: user.id,
        userName: dbUser?.name || dbUser?.email || "Unknown User",
        interactionType: validation.data.interactionType,
        category: validation.data.category,
        notes: validation.data.notes,
        outcome: validation.data.outcome || null,
        followUpNeeded: validation.data.followUpNeeded || false,
        followUpDate: validation.data.followUpDate ? new Date(validation.data.followUpDate) : null,
      },
    })

    return NextResponse.json(interaction, { status: 201 })
  } catch (error) {
    console.error("Error creating student interaction:", error)
    return NextResponse.json(
      { error: "Failed to create interaction" },
      { status: 500 }
    )
  }
}
