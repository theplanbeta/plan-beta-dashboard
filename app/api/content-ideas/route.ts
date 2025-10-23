import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/content-ideas - List all content ideas with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const topic = searchParams.get('topic')
    const limit = parseInt(searchParams.get('limit') || '50')

    const ideas = await prisma.contentIdea.findMany({
      where: {
        ...(status && { status }),
        ...(topic && { topic }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        redditPost: {
          select: {
            id: true,
            title: true,
            upvotes: true,
            subredditName: true,
            permalink: true,
          },
        },
      },
    })

    return NextResponse.json(ideas)
  } catch (error) {
    console.error('Error fetching content ideas:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content ideas' },
      { status: 500 }
    )
  }
}

// PATCH /api/content-ideas?id={id} - Update content idea
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
        { error: 'Content idea ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { status, notes, hook, script, caption, hashtags } = body

    const idea = await prisma.contentIdea.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        ...(hook && { hook }),
        ...(script && { script }),
        ...(caption && { caption }),
        ...(hashtags && { hashtags }),
      },
    })

    return NextResponse.json(idea)
  } catch (error) {
    console.error('Error updating content idea:', error)
    return NextResponse.json(
      { error: 'Failed to update content idea' },
      { status: 500 }
    )
  }
}

// DELETE /api/content-ideas?id={id} - Delete content idea
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
        { error: 'Content idea ID is required' },
        { status: 400 }
      )
    }

    await prisma.contentIdea.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting content idea:', error)
    return NextResponse.json(
      { error: 'Failed to delete content idea' },
      { status: 500 }
    )
  }
}
