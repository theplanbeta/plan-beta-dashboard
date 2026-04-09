import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"

// GET /api/instagram/posts — Dashboard endpoint for Instagram post data
export async function GET(request: NextRequest) {
  const auth = await checkPermission("analytics", "read")
  if (!auth.authorized) return auth.response

  const { searchParams } = new URL(request.url)
  const period = parseInt(searchParams.get("period") || "90", 10)
  const sort = searchParams.get("sort") || "date"
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200)
  const offset = parseInt(searchParams.get("offset") || "0", 10)

  const since = new Date()
  since.setDate(since.getDate() - period)

  const orderBy =
    sort === "likes"
      ? { likesCount: "desc" as const }
      : sort === "comments"
        ? { commentsCount: "desc" as const }
        : { publishedAt: "desc" as const }

  const [posts, total, snapshot] = await Promise.all([
    prisma.instagramPost.findMany({
      where: { publishedAt: { gte: since } },
      orderBy,
      take: limit,
      skip: offset,
    }),
    prisma.instagramPost.count({
      where: { publishedAt: { gte: since } },
    }),
    prisma.instagramSnapshot.findFirst({
      where: { username: "learn.german.with.aparnabose" },
      orderBy: { scrapedAt: "desc" },
    }),
  ])

  return NextResponse.json({
    posts,
    total,
    snapshot: snapshot
      ? {
          followersCount: snapshot.followersCount,
          followingCount: snapshot.followingCount,
          postsCount: snapshot.postsCount,
          biography: snapshot.biography,
          scrapedAt: snapshot.scrapedAt,
        }
      : null,
  })
}
