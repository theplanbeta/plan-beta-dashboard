import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { signPortalToken, signMagicLinkToken } from "@/lib/jobs-portal-auth"
import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const schema = z.object({
  email: z.string().email(),
})

// POST /api/subscriptions/magic-link — Send a magic link to restore premium session
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 })
  }

  const { email } = parsed.data

  const subscription = await prisma.jobSubscription.findUnique({
    where: { email },
    select: { status: true, tier: true },
  })

  // Always return success to prevent email enumeration
  if (!subscription || subscription.status !== "active") {
    return NextResponse.json({ success: true })
  }

  if (!resend) {
    console.error("[Magic Link] Resend not configured")
    return NextResponse.json({ success: true })
  }

  const token = await signMagicLinkToken(email)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://theplanbeta.com"
  const magicUrl = `${appUrl}/jobs/student-jobs?magic=${encodeURIComponent(token)}`

  try {
    await resend.emails.send({
      from: "Plan Beta Jobs <jobs@theplanbeta.com>",
      to: email,
      subject: "Your Premium Job Portal Access Link",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
          <h2 style="color: #111; margin-bottom: 8px;">Welcome back!</h2>
          <p style="color: #555; line-height: 1.6;">Click the button below to restore your premium access to the Student Jobs Portal.</p>
          <a href="${magicUrl}" style="display: inline-block; padding: 12px 24px; background: #7c3aed; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0;">Restore Access</a>
          <p style="color: #999; font-size: 13px; margin-top: 24px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    })
  } catch (error) {
    console.error("[Magic Link] Email send failed:", error)
  }

  return NextResponse.json({ success: true })
}

// GET /api/subscriptions/magic-link?token=... — Verify magic link and return portal token
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const magicToken = searchParams.get("token")

  if (!magicToken) {
    return NextResponse.json({ error: "Token required" }, { status: 400 })
  }

  const { verifyMagicLinkToken } = await import("@/lib/jobs-portal-auth")
  const email = await verifyMagicLinkToken(magicToken)

  if (!email) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 })
  }

  const subscription = await prisma.jobSubscription.findUnique({
    where: { email },
    select: { status: true, tier: true },
  })

  if (!subscription || subscription.status !== "active") {
    return NextResponse.json({ error: "No active subscription found" }, { status: 404 })
  }

  const portalToken = await signPortalToken(email, subscription.tier)

  return NextResponse.json({ token: portalToken, email })
}
