import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateContentIdea } from '@/lib/gemini-content-analyzer'

// POST /api/reddit/analyze - Generate content idea from a Reddit post
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { postId } = await request.json()

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    // Get the Reddit post
    const post = await prisma.redditPost.findUnique({
      where: { id: postId },
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Generate content idea using Gemini
    const idea = await generateContentIdea(
      post.title,
      post.selftext,
      post.upvotes,
      post.subredditName
    )

    // Save the content idea
    const contentIdea = await prisma.contentIdea.create({
      data: {
        redditPostId: post.id,
        hook: idea.hook,
        script: idea.script,
        visualSuggestions: idea.visualSuggestions,
        caption: idea.caption,
        hashtags: idea.hashtags,
        topic: idea.topic,
        status: 'DRAFT',
      },
    })

    // Mark post as analyzed
    await prisma.redditPost.update({
      where: { id: post.id },
      data: { analyzed: true },
    })

    return NextResponse.json(contentIdea)
  } catch (error: any) {
    console.error('Error analyzing post:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze post' },
      { status: 500 }
    )
  }
}
