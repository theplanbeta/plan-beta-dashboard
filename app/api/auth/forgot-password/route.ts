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

    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0; padding: 20px; background-color: #f3f4f6;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: white; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #d2302c 0%, #121212 100%); padding: 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 700;">Plan Beta</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 13px; letter-spacing: 3px; text-transform: uppercase;">School of German</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Password Reset Request</h2>

              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 15px 0;">
                Hi ${user.name},
              </p>

              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                We received a request to reset your password for your Plan Beta account. Click the button below to create a new password:
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; background-color: #d2302c; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Reset Password</a>
                  </td>
                </tr>
              </table>

              <!-- Warning -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0 0 8px 0; color: #92400e; font-size: 14px; font-weight: bold;">
                      This link expires in 1 hour
                    </p>
                    <p style="margin: 0; color: #92400e; font-size: 13px;">
                      For security reasons, this password reset link will expire in 60 minutes.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                If you did not request this password reset, you can safely ignore this email. Your password will not be changed.
              </p>

              <!-- Link fallback -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <tr>
                  <td>
                    <p style="color: #9ca3af; font-size: 12px; line-height: 1.6; margin: 0;">
                      If the button does not work, copy and paste this link into your browser:<br>
                      <a href="${resetUrl}" style="color: #d2302c; word-break: break-all;">${resetUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Support -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <p style="color: #6b7280; font-size: 13px; margin: 0;">
                      Need help? Contact us at <a href="mailto:${process.env.SUPPORT_EMAIL || 'hello@planbeta.in'}" style="color: #d2302c; text-decoration: none;">${process.env.SUPPORT_EMAIL || 'hello@planbeta.in'}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 20px; background-color: #f9fafb;">
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                &copy; ${new Date().getFullYear()} Plan Beta. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    try {
      const result = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'Plan Beta <noreply@planbeta.in>',
        to: user.email,
        subject: 'Reset Your Password - Plan Beta',
        html: emailHtml,
      })

      console.log(`✅ Password reset email sent to ${user.email}`, result)
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
