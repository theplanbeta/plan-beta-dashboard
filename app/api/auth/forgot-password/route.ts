import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { generateResetToken, getTokenExpiry } from '@/lib/password-utils'
import { logSuccess } from '@/lib/audit'
import { AuditAction } from '@prisma/client'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { Resend } from 'resend'

const limiter = rateLimit(RATE_LIMITS.STRICT)
const resend = new Resend(process.env.RESEND_API_KEY)

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

    // Send password reset email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://plan-beta-dashboard.vercel.app'}/reset-password?token=${resetToken}`

    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'Plan Beta <noreply@planbeta.in>',
        to: user.email,
        subject: 'Reset Your Password - Plan Beta',
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #d2302c 0%, #121212 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 700;">Plan Beta</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 13px; letter-spacing: 3px; text-transform: uppercase;">School of German</p>
            </div>

            <div style="background: white; padding: 40px 30px; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Password Reset Request</h2>

              <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                Hi ${user.name},
              </p>

              <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                We received a request to reset your password for your Plan Beta account. Click the button below to create a new password:
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: #d2302c; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Reset Password
                </a>
              </div>

              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 25px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>⚠️ This link expires in 1 hour</strong>
                </p>
                <p style="margin: 8px 0 0 0; color: #92400e; font-size: 13px;">
                  For security reasons, this password reset link will expire in 60 minutes.
                </p>
              </div>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.
              </p>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; line-height: 1.6;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <a href="${resetUrl}" style="color: #d2302c; word-break: break-all;">${resetUrl}</a>
                </p>
              </div>

              <div style="margin-top: 30px; text-align: center;">
                <p style="color: #6b7280; font-size: 13px;">
                  Need help? Contact us at <a href="mailto:${process.env.SUPPORT_EMAIL || 'hello@planbeta.in'}" style="color: #d2302c; text-decoration: none;">${process.env.SUPPORT_EMAIL || 'hello@planbeta.in'}</a>
                </p>
              </div>
            </div>

            <div style="text-align: center; margin-top: 20px; padding: 20px;">
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                © ${new Date().getFullYear()} Plan Beta. All rights reserved.
              </p>
            </div>
          </div>
        `,
      })

      console.log(`✅ Password reset email sent to ${user.email}`)
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError)
      // Don't fail the request if email fails - user can try again
    }

    // Return success message
    return NextResponse.json(
      {
        message: 'If an account with that email exists, a password reset link has been sent.',
        // Include reset URL in development for testing
        ...(process.env.NODE_ENV === 'development' && {
          resetUrl,
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
