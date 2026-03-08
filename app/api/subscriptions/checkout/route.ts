import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { stripe } from "@/lib/stripe"

const checkoutSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  professions: z.array(z.string()).default([]),
  germanLevels: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  jobTypes: z.array(z.string()).default([]),
})

// POST /api/subscriptions/checkout — Create a Stripe Checkout session for job alert subscription
export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 }
    )
  }

  if (!process.env.STRIPE_PRICE_ID) {
    return NextResponse.json(
      { error: "Subscription price not configured" },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { email, name, professions, germanLevels, locations, jobTypes } = parsed.data
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://planbeta.app"

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      metadata: {
        name: name || "",
        professions: professions.join(","),
        germanLevels: germanLevels.join(","),
        locations: locations.join(","),
        jobTypes: jobTypes.join(","),
      },
      success_url: `${appUrl}/site/opportunities?subscribed=true`,
      cancel_url: `${appUrl}/site/opportunities`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("[Stripe Checkout] Error:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
