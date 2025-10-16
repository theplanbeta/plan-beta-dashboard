import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

/**
 * POST /api/auth/welcome-login
 * Validate welcome token and provide temporary credentials for auto-login
 */
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Find user with this welcome token
    const user = await prisma.user.findFirst({
      where: {
        welcomeToken: token,
        active: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        welcomeTokenExpiry: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired link' },
        { status: 404 }
      )
    }

    // Check if token has expired
    if (!user.welcomeTokenExpiry || user.welcomeTokenExpiry < new Date()) {
      // Clear the expired token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          welcomeToken: null,
          welcomeTokenExpiry: null,
        },
      })

      return NextResponse.json(
        { error: 'This link has expired. Please contact support.' },
        { status: 410 }
      )
    }

    // Generate a temporary password for this login session
    const tempPassword = crypto.randomBytes(32).toString('hex')
    const hashedTempPassword = await bcrypt.hash(tempPassword, 10)

    // Update user with temp password, clear welcome token, set password change required
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedTempPassword,
        welcomeToken: null,
        welcomeTokenExpiry: null,
        requirePasswordChange: true,
      },
    })

    console.log(`✅ Welcome login processed for ${user.email}`)

    // Return credentials for auto-login
    return NextResponse.json({
      email: user.email,
      tempPassword,
    })
  } catch (error) {
    console.error('Error processing welcome login:', error)
    return NextResponse.json(
      { error: 'Failed to process login' },
      { status: 500 }
    )
  }
}
