import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const comments = await prisma.instagramComment.findMany({
      orderBy: { commentedAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error('Error fetching Instagram comments:', error)
    return NextResponse.json([], { status: 500 })
  }
}
