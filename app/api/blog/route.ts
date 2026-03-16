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
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = parseInt(searchParams.get("limit") || "10", 10)

  // Determine if user is authenticated (for draft access)
  const session = await getServerSession(authOptions)
  const isAuthenticated = !!session?.user

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}

  if (publishedParam === "false" && isAuthenticated) {
    where.published = false
  } else if (publishedParam === "all" && isAuthenticated) {
    // No filter on published — show all
  } else {
    // Default: only published posts
    where.published = true
  }

  if (category && category !== "All") {
    where.category = category
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
