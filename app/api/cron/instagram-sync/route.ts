import { NextRequest, NextResponse } from "next/server"
import { verifyCronSecret } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"
import {
  scrapeInstagramProfile,
  scrapeInstagramPosts,
} from "@/lib/apify"

export const maxDuration = 300

const INSTAGRAM_USERNAME = "learn.german.with.aparnabose"

// GET /api/cron/instagram-sync — Daily Instagram data sync via Apify
// Runs at 7 AM UTC (configured in vercel.json)
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    console.log("[Cron] Starting Instagram sync...")

    // 1. Scrape profile data
    const profile = await scrapeInstagramProfile(INSTAGRAM_USERNAME)

    let snapshotId: string | null = null
    if (profile) {
      const snapshot = await prisma.instagramSnapshot.create({
        data: {
          username: profile.username,
          followersCount: profile.followersCount,
          followingCount: profile.followsCount,
          postsCount: profile.postsCount,
          biography: profile.biography || null,
        },
      })
      snapshotId = snapshot.id
      console.log(
        `[Cron] Instagram snapshot saved: ${profile.followersCount} followers`
      )
    } else {
      console.warn("[Cron] Instagram profile scrape returned no data")
    }

    // 2. Scrape recent posts
    const posts = await scrapeInstagramPosts(INSTAGRAM_USERNAME, 50)
    let upserted = 0

    for (const post of posts) {
      await prisma.instagramPost.upsert({
        where: { shortCode: post.shortCode },
        create: {
          shortCode: post.shortCode,
          type: post.type,
          caption: post.caption || null,
          permalink: post.url,
          thumbnailUrl: post.displayUrl || null,
          likesCount: post.likesCount ?? 0,
          commentsCount: post.commentsCount ?? 0,
          videoPlayCount: post.videoPlayCount ?? null,
          hashtags: post.hashtags ?? [],
          mentions: post.mentions ?? [],
          isPinned: post.isPinned ?? false,
          ownerUsername: post.ownerUsername || INSTAGRAM_USERNAME,
          publishedAt: new Date(post.timestamp),
        },
        update: {
          likesCount: post.likesCount ?? 0,
          commentsCount: post.commentsCount ?? 0,
          videoPlayCount: post.videoPlayCount ?? null,
          caption: post.caption || null,
          thumbnailUrl: post.displayUrl || null,
          hashtags: post.hashtags ?? [],
          mentions: post.mentions ?? [],
          isPinned: post.isPinned ?? false,
          lastScrapedAt: new Date(),
        },
      })
      upserted++
    }

    console.log(`[Cron] Instagram sync complete: ${upserted} posts upserted`)

    return NextResponse.json({
      success: true,
      snapshotId,
      followersCount: profile?.followersCount ?? null,
      postsUpserted: upserted,
    })
  } catch (error) {
    console.error("[Cron] Instagram sync error:", error)
    return NextResponse.json(
      {
        error: "Instagram sync failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
