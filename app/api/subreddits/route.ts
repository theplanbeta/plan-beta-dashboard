import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateSubreddit, getSubredditInfo } from '@/lib/reddit-api'

// GET /api/subreddits - List all subreddits
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subreddits = await prisma.subreddit.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    })

    return NextResponse.json(subreddits)
  } catch (error) {
    console.error('Error fetching subreddits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subreddits' },
      { status: 500 }
    )
  }
}

// POST /api/subreddits - Add new subreddit
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, category } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Subreddit name is required' },
        { status: 400 }
      )
    }

    // Clean up subreddit name (remove r/ if present)
    const cleanName = name.replace(/^r\//, '').trim()

    // Validate subreddit exists
    const isValid = await validateSubreddit(cleanName)
    if (!isValid) {
      return NextResponse.json(
        { error: `Subreddit r/${cleanName} not found or is private` },
        { status: 400 }
      )
    }

    // Get subreddit info
    let description = null
    try {
      const info = await getSubredditInfo(cleanName)
      description = info.description || info.title
    } catch (error) {
      console.warn(`Could not fetch info for r/${cleanName}`)
    }

    // Create subreddit
    const subreddit = await prisma.subreddit.create({
      data: {
        name: cleanName,
        description,
        category: category || null,
        active: true,
      },
    })

    return NextResponse.json(subreddit, { status: 201 })
  } catch (error: any) {
    console.error('Error creating subreddit:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This subreddit is already added' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to add subreddit' },
      { status: 500 }
    )
  }
}

// DELETE /api/subreddits?id={id} - Delete subreddit
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Subreddit ID is required' },
        { status: 400 }
      )
    }

    await prisma.subreddit.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting subreddit:', error)
    return NextResponse.json(
      { error: 'Failed to delete subreddit' },
      { status: 500 }
    )
  }
}

// PATCH /api/subreddits?id={id} - Update subreddit (toggle active, update category)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Subreddit ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { active, category } = body

    const subreddit = await prisma.subreddit.update({
      where: { id },
      data: {
        ...(typeof active === 'boolean' && { active }),
        ...(category !== undefined && { category }),
      },
    })

    return NextResponse.json(subreddit)
  } catch (error) {
    console.error('Error updating subreddit:', error)
    return NextResponse.json(
      { error: 'Failed to update subreddit' },
      { status: 500 }
    )
  }
}
