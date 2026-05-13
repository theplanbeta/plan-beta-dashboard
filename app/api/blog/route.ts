import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET /api/blog — list blog posts
// Public: returns published posts only
// Authenticated: can also see drafts with ?published=false
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const publishedParam = searchParams.get("published")
  const category = searchParams.get("category")
  const approvalStatusParam = searchParams.get("approvalStatus")
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = parseInt(searchParams.get("limit") || "10", 10)

  const session = await getServerSession(authOptions)
  const isAuthenticated = !!session?.user

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}

  if (publishedParam === "false" && isAuthenticated) {
    where.published = false
  } else if (publishedParam === "all" && isAuthenticated) {
    // No filter on published — show all
  } else {
    where.published = true
  }

  if (category && category !== "All") {
    where.category = category
  }

  if (approvalStatusParam && isAuthenticated) {
    where.approvalStatus = approvalStatusParam
  }

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        category: true,
        tags: true,
        readTime: true,
        published: true,
        featured: true,
        publishedAt: true,
        author: true,
        createdAt: true,
        approvalStatus: true,
        submittedAt: true,
        submittedBy: true,
        reviewedAt: true,
        reviewedBy: true,
        reviewNotes: true,
        readerProfile: true,
      },
      orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.blogPost.count({ where }),
  ])

  return NextResponse.json({
    posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
