import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { stripe } from "@/lib/stripe"
import { requireJobSeeker } from "@/lib/jobs-app-auth"

const bodySchema = z.object({
  plan: z.enum(["monthly", "annual"]).default("monthly"),
})

/**
 * POST /api/jobs-app/subscribe/checkout
 *
 * Creates a Stripe Checkout session for the PWA "Pro" tier (EUR 4.99/mo
 * or EUR 49.99/yr). Tags the session with metadata so the webhook can
 * upsert the JobSeeker record by email.
 */
export async function POST(request: NextRequest) {
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
  }

  const { plan } = parsed.data

  // Price IDs for the PRO tier (new, separate from legacy basic portal)
  const proMonthly = (
    process.env.STRIPE_PRO_PRICE_MONTHLY_EU || ""
  ).trim()
  const proAnnual = (
    process.env.STRIPE_PRO_PRICE_ANNUAL_EU || ""
  ).trim()

  const priceId = plan === "annual" ? proAnnual : proMonthly
  if (!priceId) {
    return NextResponse.json(
      {
        error: `Pro tier ${plan} price not configured. Set STRIPE_PRO_PRICE_${plan === "annual" ? "ANNUAL" : "MONTHLY"}_EU`,
      },
      { status: 503 }
    )
  }

  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || ""
  const appUrl = rawAppUrl.startsWith("https://")
    ? rawAppUrl.trim().replace(/\/+$/, "")
    : "https://jobs.planbeta.app"

  const successUrl = `${appUrl}/jobs-app/settings?upgraded=true&session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${appUrl}/jobs-app/settings`

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: seeker.email,
      client_reference_id: seeker.id,
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          source: "jobs-app",
          tier: "pro",
          seekerId: seeker.id,
          seekerEmail: seeker.email,
        },
      },
      metadata: {
        source: "jobs-app",
        tier: "pro",
        seekerId: seeker.id,
        seekerEmail: seeker.email,
      },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    console.error("[Jobs App Checkout] Error:", msg)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
