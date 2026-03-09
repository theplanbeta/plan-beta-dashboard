import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { stripe } from "@/lib/stripe"

const checkoutSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  whatsapp: z.string().optional(),
  professions: z.array(z.string()).default([]),
  germanLevels: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  jobTypes: z.array(z.string()).default([]),
  whatsappAlerts: z.boolean().default(false),
  pushAlerts: z.boolean().default(false),
})

// POST /api/subscriptions/checkout — Create a Stripe Checkout session for job alert subscription
export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 }
    )
  }

  // Use premium price if available, fall back to legacy price
  const priceId = process.env.STRIPE_PREMIUM_PRICE_ID || process.env.STRIPE_PRICE_ID
  if (!priceId) {
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

  const { email, name, whatsapp, professions, germanLevels, locations, jobTypes, whatsappAlerts, pushAlerts } = parsed.data
  // Use NEXT_PUBLIC_APP_URL or hardcoded fallback — must be clean HTTPS URL
  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || ""
  const appUrl = rawAppUrl.startsWith("https://") ? rawAppUrl.trim().replace(/\/+$/, "") : "https://theplanbeta.com"
  const successUrl = `${appUrl}/jobs/student-jobs?subscribed=true&session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${appUrl}/jobs/student-jobs`
  console.log("[Stripe Checkout] success_url:", successUrl)

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      subscription_data: {
        trial_period_days: 5,
        metadata: {
          name: name || "",
          whatsapp: whatsapp || "",
          professions: professions.join(","),
          germanLevels: germanLevels.join(","),
          locations: locations.join(","),
          jobTypes: jobTypes.join(","),
          whatsappAlerts: String(whatsappAlerts),
          pushAlerts: String(pushAlerts),
        },
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        portalEmail: email,
        name: name || "",
        whatsapp: whatsapp || "",
        professions: professions.join(","),
        germanLevels: germanLevels.join(","),
        locations: locations.join(","),
        jobTypes: jobTypes.join(","),
        whatsappAlerts: String(whatsappAlerts),
        pushAlerts: String(pushAlerts),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    console.error("[Stripe Checkout] Error:", msg)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
