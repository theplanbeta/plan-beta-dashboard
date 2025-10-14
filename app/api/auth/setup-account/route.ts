import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash, compare } from 'bcryptjs'
import { z } from 'zod'
import { validatePasswordStrength } from '@/lib/password-utils'
import { logSuccess } from '@/lib/audit'
import { AuditAction } from '@prisma/client'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const limiter = rateLimit(RATE_LIMITS.STRICT)

// Validation schema
const setupAccountSchema = z.object({
  email: z.string().email('Invalid email address'),
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// POST /api/auth/setup-account - Setup account for first-time users
export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await limiter(req)
    if (rateLimitResult) return rateLimitResult

    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()

    // Validate request
    const validation = setupAccountSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { email, currentPassword, newPassword } = validation.data

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', details: passwordValidation.errors },
        { status: 400 }
      )
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify current password
    const isCurrentPasswordValid = await compare(currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    // Check if new email already exists (for another user)
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        NOT: {
          id: user.id,
        },
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already in use by another account' },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await hash(newPassword, 10)

    // Update email and password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
      },
    })

    // Audit log
    await logSuccess(
      AuditAction.USER_UPDATED,
      `Account setup completed for user: ${user.name} (${email})`,
      {
        entityType: 'User',
        entityId: user.id,
        metadata: {
          userId: user.id,
          oldEmail: user.email,
          newEmail: email,
          action: 'account_setup',
        },
        request: req,
      }
    )

    return NextResponse.json(
      { message: 'Account setup completed successfully', email: email.toLowerCase() },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error setting up account:', error)
    return NextResponse.json(
      { error: 'Failed to setup account' },
      { status: 500 }
    )
  }
}
