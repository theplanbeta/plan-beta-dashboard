import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { signPortalToken } from "@/lib/jobs-portal-auth"

// POST /api/subscriptions/activate — Exchange a Stripe Checkout session_id for a portal JWT
// Also ensures the DB subscription record exists (in case webhook hasn't fired yet)
export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 })
  }

  let body: { session_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const sessionId = body.session_id
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "session_id required" }, { status: 400 })
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    // For trials, payment_status may be "no_payment_required"
    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
      return NextResponse.json({ error: "Session not completed" }, { status: 400 })
    }

    const email = session.customer_email || session.metadata?.portalEmail
    if (!email) {
      return NextResponse.json({ error: "No email found in session" }, { status: 400 })
    }

    const metadata = session.metadata || {}
    const customerId = session.customer as string | null
    const subscriptionId = session.subscription as string | null

    // Ensure DB record exists (webhook may not have fired yet)
    let periodEnd: Date | null = null
    let tier = "premium"
    if (subscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId)
        const pe = sub.items?.data?.[0]?.current_period_end
        periodEnd = pe ? new Date(pe * 1000) : null
        const priceId = (process.env.STRIPE_PREMIUM_PRICE_ID || "").trim()
        tier = sub.items.data[0]?.price?.id === priceId ? "premium" : "legacy"
      } catch {
        // subscription retrieve failed — use defaults
      }
    }

    await prisma.jobSubscription.upsert({
      where: { email },
      create: {
        email,
        name: metadata.name || null,
        whatsapp: metadata.whatsapp || null,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        currentPeriodEnd: periodEnd,
        status: "active",
        tier,
        professions: metadata.professions ? metadata.professions.split(",").filter(Boolean) : [],
        germanLevels: metadata.germanLevels ? metadata.germanLevels.split(",").filter(Boolean) : [],
        locations: metadata.locations ? metadata.locations.split(",").filter(Boolean) : [],
        jobTypes: metadata.jobTypes ? metadata.jobTypes.split(",").filter(Boolean) : [],
        whatsappAlerts: metadata.whatsappAlerts === "true",
        pushAlerts: metadata.pushAlerts === "true",
      },
      update: {
        status: "active",
        stripeCustomerId: customerId || undefined,
        stripeSubscriptionId: subscriptionId || undefined,
        ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
        tier,
      },
    })

    console.log(`[Activate] Subscription activated for ${email}`)

    const token = await signPortalToken(email, "premium")
    return NextResponse.json({ token, email })
  } catch (error) {
    console.error("[Activate] Error:", error)
    return NextResponse.json({ error: "Activation failed" }, { status: 500 })
  }
}
