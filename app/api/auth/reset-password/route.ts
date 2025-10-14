import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { validatePasswordStrength, isTokenExpired } from '@/lib/password-utils'
import { logSuccess } from '@/lib/audit'
import { AuditAction } from '@prisma/client'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const limiter = rateLimit(RATE_LIMITS.STRICT)

// Validation schema
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// POST /api/auth/reset-password - Reset password using token
export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await limiter(req)
    if (rateLimitResult) return rateLimitResult

    const body = await req.json()

    // Validate request
    const validation = resetPasswordSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { token, newPassword } = validation.data

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', details: passwordValidation.errors },
        { status: 400 }
      )
    }

    // Find user by reset token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
      },
      select: {
        id: true,
        email: true,
        name: true,
        passwordResetToken: true,
        passwordResetExpiry: true,
      },
    })

    if (!user || !user.passwordResetToken || !user.passwordResetExpiry) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (isTokenExpired(user.passwordResetExpiry)) {
      // Clear expired token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: null,
          passwordResetExpiry: null,
        },
      })

      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new password reset.' },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await hash(newPassword, 10)

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    })

    // Audit log
    await logSuccess(
      AuditAction.PASSWORD_RESET_COMPLETED,
      `Password reset completed for user: ${user.name} (${user.email})`,
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

    return NextResponse.json(
      { message: 'Password reset successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
