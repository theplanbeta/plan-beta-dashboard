import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"
import { z } from "zod"

// Validation schema for creating posts
const createPostSchema = z.object({
  studentId: z.string().min(1, "Student ID required"),
  title: z.string().min(1, "Title required").max(200, "Title too long"),
  content: z.string().min(1, "Content required"),
  contentType: z.enum(["STORY", "POEM", "ESSAY", "LETTER", "DIALOGUE", "VOCABULARY", "GRAMMAR_TIP", "OTHER"]),
  level: z.enum(["NEW", "A1", "A1_HYBRID", "A1_HYBRID_MALAYALAM", "A2", "B1", "B2", "SPOKEN_GERMAN"]).optional(),
  language: z.string().default("de"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
})

// GET /api/content-wall - Get all posts
export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("students", "read")
    if (!check.authorized) return check.response

    const { searchParams } = new URL(request.url)
    const contentType = searchParams.get("contentType")
    const level = searchParams.get("level")
    const status = searchParams.get("status") || "PUBLISHED"
    const studentId = searchParams.get("studentId")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    const where: any = {
      status: status as any,
    }

    if (contentType) where.contentType = contentType
    if (level) where.level = level
    if (studentId) where.studentId = studentId

    const [posts, total] = await Promise.all([
      prisma.contentPost.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
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
        orderBy: [
          { featured: "desc" },
          { createdAt: "desc" },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.contentPost.count({ where }),
    ])

    return NextResponse.json({
      posts,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    })
  } catch (error) {
    console.error("Error fetching posts:", error)
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    )
  }
}

// POST /api/content-wall - Create new post
export async function POST(request: NextRequest) {
  try {
    const check = await checkPermission("students", "update")
    if (!check.authorized) return check.response

    const body = await request.json()

    // Validate request body
    const validation = createPostSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    // Verify student exists (lookup by studentId, not internal id)
    const student = await prisma.student.findUnique({
      where: { studentId: data.studentId },
    })

    if (!student) {
      return NextResponse.json(
        { error: "Student not found. Please check your student ID." },
        { status: 404 }
      )
    }

    // Create post (use internal id as foreign key)
    const post = await prisma.contentPost.create({
      data: {
        studentId: student.id, // Use internal id for foreign key
        title: data.title,
        content: data.content,
        contentType: data.contentType,
        level: data.level || null,
        language: data.language,
        status: data.status,
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

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error("Error creating post:", error)
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    )
  }
}
