import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchSubredditPosts, formatPostForStorage } from '@/lib/reddit-api'

// POST /api/reddit/fetch - Fetch posts from all active subreddits
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subredditId, limit = 25 } = await request.json()

    // If specific subreddit requested, fetch only that one
    if (subredditId) {
      const subreddit = await prisma.subreddit.findUnique({
        where: { id: subredditId },
      })

      if (!subreddit) {
        return NextResponse.json(
          { error: 'Subreddit not found' },
          { status: 404 }
        )
      }

      const posts = await fetchSubredditPosts(subreddit.name, limit)
      const savedCount = await savePostsToDatabase(subreddit.id, subreddit.name, posts)

      // Update last fetched timestamp
      await prisma.subreddit.update({
        where: { id: subredditId },
        data: {
          lastFetched: new Date(),
          postCount: savedCount,
        },
      })

      return NextResponse.json({
        success: true,
        subreddit: subreddit.name,
        fetched: posts.length,
        saved: savedCount,
      })
    }

    // Otherwise, fetch from all active subreddits
    const subreddits = await prisma.subreddit.findMany({
      where: { active: true },
    })

    if (subreddits.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active subreddits to fetch from',
        results: [],
      })
    }

    const results = []

    for (const subreddit of subreddits) {
      try {
        const posts = await fetchSubredditPosts(subreddit.name, limit)
        const savedCount = await savePostsToDatabase(subreddit.id, subreddit.name, posts)

        // Update last fetched timestamp
        await prisma.subreddit.update({
          where: { id: subreddit.id },
          data: {
            lastFetched: new Date(),
            postCount: savedCount,
          },
        })

        results.push({
          subreddit: subreddit.name,
          fetched: posts.length,
          saved: savedCount,
        })

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`Error fetching r/${subreddit.name}:`, error)
        results.push({
          subreddit: subreddit.name,
          error: 'Failed to fetch',
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error('Error fetching Reddit posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

// Helper function to save posts to database
async function savePostsToDatabase(
  subredditId: string,
  subredditName: string,
  posts: any[]
): Promise<number> {
  let savedCount = 0

  for (const post of posts) {
    try {
      const formattedPost = formatPostForStorage(post)

      await prisma.redditPost.upsert({
        where: { redditId: post.id },
        update: {
          upvotes: formattedPost.upvotes,
          numComments: formattedPost.numComments,
        },
        create: {
          ...formattedPost,
          subredditId,
        },
      })

      savedCount++
    } catch (error) {
      console.error(`Error saving post ${post.id}:`, error)
    }
  }

  return savedCount
}

// GET /api/reddit/fetch - Get all fetched posts with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const subredditId = searchParams.get('subredditId')
    const saved = searchParams.get('saved')
    const limit = parseInt(searchParams.get('limit') || '50')

    const posts = await prisma.redditPost.findMany({
      where: {
        ...(subredditId && { subredditId }),
        ...(saved === 'true' && { saved: true }),
      },
      orderBy: { postedAt: 'desc' },
      take: limit,
      include: {
        subreddit: {
          select: {
            name: true,
            category: true,
          },
        },
        contentIdeas: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json(posts)
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}
