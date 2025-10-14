import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  category: z.string().max(50).optional(),
  comment: z.string().min(3, "Please add a brief comment.").max(2000, "Comment too long"),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const check = await checkPermission("students", "read")
    if (!check.authorized) return check.response

    const { id } = await params

    const reviews = await prisma.teacherReview.findMany({
      where: { studentId: id },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(reviews)
  } catch (error) {
    console.error("Error fetching teacher reviews:", error)
    return NextResponse.json(
      { error: "Failed to load teacher reviews" },
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

    const validation = reviewSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

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

    const { user } = check.session

    if (
      user.role === "TEACHER" &&
      student.batch?.teacherId &&
      student.batch.teacherId !== user.id
    ) {
      return NextResponse.json(
        { error: "You can only review students in your batches" },
        { status: 403 }
      )
    }

    const review = await prisma.teacherReview.create({
      data: {
        studentId: id,
        teacherId: user.id,
        rating: validation.data.rating ?? null,
        category: validation.data.category || null,
        comment: validation.data.comment,
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    console.error("Error creating teacher review:", error)
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    )
  }
}
