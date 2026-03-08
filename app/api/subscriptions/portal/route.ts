import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

const portalSchema = z.object({
  email: z.string().email(),
})

// POST /api/subscriptions/portal — Create a Stripe Customer Portal session
export async function POST(request: NextRequest) {
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

  const parsed = portalSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { email } = parsed.data

  try {
    const subscription = await prisma.jobSubscription.findUnique({
      where: { email },
      select: { stripeCustomerId: true },
    })

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No subscription found for this email" },
        { status: 404 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://planbeta.app"

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${appUrl}/opportunities`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("[Stripe Portal] Error:", error)
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 })
  }
}
