import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createCommentSchema = z.object({
  studentId: z.string().min(1, "Student ID required"),
  content: z.string().min(1, "Comment content required").max(1000, "Comment too long"),
})

// POST /api/content-wall/[id]/comment - Add comment to post
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params
    const body = await request.json()

    // Validate request body
    const validation = createCommentSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const { studentId, content } = validation.data

    // Check if post exists
    const post = await prisma.contentPost.findUnique({
      where: { id: postId },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Create comment
    const comment = await prisma.contentComment.create({
      data: {
        postId,
        studentId,
        content,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            currentLevel: true,
          },
        },
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error("Error creating comment:", error)
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    )
  }
}

// GET /api/content-wall/[id]/comment - Get comments for a post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params

    const comments = await prisma.contentComment.findMany({
      where: { postId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            currentLevel: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({
      count: comments.length,
      comments,
    })
  } catch (error) {
    console.error("Error fetching comments:", error)
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    )
  }
}
