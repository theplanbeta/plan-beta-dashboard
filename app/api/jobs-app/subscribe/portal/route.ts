import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { requireJobSeeker } from "@/lib/jobs-app-auth"

/**
 * POST /api/jobs-app/subscribe/portal
 *
 * Redirects to the Stripe Customer Portal so the user can manage
 * or cancel their Pro subscription.
 */
export async function POST(request: Request) {
  let seeker
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 }
    )
  }

  if (!seeker.stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer found for this account" },
      { status: 404 }
    )
  }

  // SECURITY: allowlist valid origins to prevent open-redirect attacks.
  const ALLOWED_ORIGINS = new Set([
    "https://dayzero.xyz",
    "https://www.dayzero.xyz",
    "https://planbeta.app",
    "https://theplanbeta.com",
    "http://localhost:3000",
  ])
  const originHeader = request.headers.get("origin") || ""
  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || ""
  const appUrl = ALLOWED_ORIGINS.has(originHeader)
    ? originHeader
    : rawAppUrl.startsWith("https://")
    ? rawAppUrl.trim().replace(/\/+$/, "")
    : "https://dayzero.xyz"

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: seeker.stripeCustomerId,
      return_url: `${appUrl}/jobs-app/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    console.error("[Jobs App Portal] Error:", msg)
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    )
  }
}
