import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST /api/content-wall/[id]/like - Toggle like on post
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params
    const body = await request.json()
    const { studentId } = body

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID required" },
        { status: 400 }
      )
    }

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

    // Check if already liked
    const existingLike = await prisma.contentLike.findUnique({
      where: {
        postId_studentId: {
          postId,
          studentId,
        },
      },
    })

    if (existingLike) {
      // Unlike - remove the like
      await prisma.contentLike.delete({
        where: {
          postId_studentId: {
            postId,
            studentId,
          },
        },
      })

      return NextResponse.json({ liked: false, message: "Like removed" })
    } else {
      // Like - add the like
      await prisma.contentLike.create({
        data: {
          postId,
          studentId,
        },
      })

      return NextResponse.json({ liked: true, message: "Post liked" })
    }
  } catch (error) {
    console.error("Error toggling like:", error)
    return NextResponse.json(
      { error: "Failed to toggle like" },
      { status: 500 }
    )
  }
}

// GET /api/content-wall/[id]/like - Get likes for a post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params

    const likes = await prisma.contentLike.findMany({
      where: { postId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({
      count: likes.length,
      likes,
    })
  } catch (error) {
    console.error("Error fetching likes:", error)
    return NextResponse.json(
      { error: "Failed to fetch likes" },
      { status: 500 }
    )
  }
}
