import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { generateResetToken, getTokenExpiry } from '@/lib/password-utils'
import { logSuccess } from '@/lib/audit'
import { AuditAction } from '@prisma/client'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const limiter = rateLimit(RATE_LIMITS.AUTH)

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

// POST /api/auth/forgot-password - Generate password reset token
export async function POST(req: NextRequest) {
  try {
    // Apply strict rate limiting for password reset
    const rateLimitResult = await limiter(req)
    if (rateLimitResult) return rateLimitResult

    const body = await req.json()

    // Validate request
    const validation = forgotPasswordSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { email } = validation.data

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
      },
    })

    // Always return success to prevent email enumeration
    // Even if user doesn't exist, respond with success
    if (!user || !user.active) {
      return NextResponse.json(
        { message: 'If an account with that email exists, a password reset link has been sent.' },
        { status: 200 }
      )
    }

    // Generate reset token
    const resetToken = generateResetToken()
    const resetExpiry = getTokenExpiry()

    // Store reset token in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetExpiry,
      },
    })

    // Audit log
    await logSuccess(
      AuditAction.PASSWORD_RESET_REQUESTED,
      `Password reset requested for user: ${user.name} (${user.email})`,
      {
        entityType: 'User',
        entityId: user.id,
        metadata: {
          userId: user.id,
          userEmail: user.email,
        },
        request: req,
      }
    )

    // TODO: Send email with reset link
    // For now, we'll return the token in development
    // In production, this should be sent via email only
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`

    console.log('Password reset URL:', resetUrl)
    console.log('Reset token expires at:', resetExpiry)

    // Return success message
    return NextResponse.json(
      {
        message: 'If an account with that email exists, a password reset link has been sent.',
        // Remove these in production - only for development/testing
        ...(process.env.NODE_ENV === 'development' && {
          resetUrl,
          resetToken,
          expiresAt: resetExpiry,
        }),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in forgot password:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
