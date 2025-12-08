import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  contentType: z.enum(["STORY", "POEM", "ESSAY", "LETTER", "DIALOGUE", "VOCABULARY", "GRAMMAR_TIP", "OTHER"]).optional(),
  level: z.enum(["NEW", "A1", "A1_HYBRID", "A1_HYBRID_MALAYALAM", "A2", "B1", "B2", "SPOKEN_GERMAN"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  featured: z.boolean().optional(),
})

// GET /api/content-wall/[id] - Get single post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const post = await prisma.contentPost.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            currentLevel: true,
          },
        },
        likes: {
          select: {
            studentId: true,
          },
        },
        comments: {
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
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Increment view count
    await prisma.contentPost.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    })

    return NextResponse.json(post)
  } catch (error) {
    console.error("Error fetching post:", error)
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    )
  }
}

// PUT /api/content-wall/[id] - Update post
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate request body
    const validation = updatePostSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    // Check if post exists
    const existingPost = await prisma.contentPost.findUnique({
      where: { id },
    })

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Update post
    const post = await prisma.contentPost.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
        ...(data.contentType && { contentType: data.contentType }),
        ...(data.level !== undefined && { level: data.level || null }),
        ...(data.status && { status: data.status }),
        ...(data.featured !== undefined && { featured: data.featured }),
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            currentLevel: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    })

    return NextResponse.json(post)
  } catch (error) {
    console.error("Error updating post:", error)
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    )
  }
}

// DELETE /api/content-wall/[id] - Delete post
// Permissions: Student who owns the post, FOUNDER (admin), or TEACHER
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { studentId } = body

    // Get session for admin/teacher access
    const session = await getServerSession(authOptions)

    // Check if post exists
    const post = await prisma.contentPost.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            studentId: true,
          },
        },
      },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Permission check:
    // 1. FOUNDER (admin) can delete any post
    // 2. TEACHER can delete any post
    // 3. Student who owns the post can delete it
    const isAdmin = session?.user?.role === "FOUNDER"
    const isTeacher = session?.user?.role === "TEACHER"
    const isOwner = studentId && post.student.studentId === studentId

    if (!isAdmin && !isTeacher && !isOwner) {
      return NextResponse.json(
        { error: "You don't have permission to delete this post" },
        { status: 403 }
      )
    }

    await prisma.contentPost.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: "Post deleted successfully" })
  } catch (error) {
    console.error("Error deleting post:", error)
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    )
  }
}
