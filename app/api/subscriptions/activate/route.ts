import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { signPortalToken } from "@/lib/jobs-portal-auth"

// POST /api/subscriptions/activate — Exchange a Stripe Checkout session_id for a portal JWT
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

    // For trials, payment_status may be "no_payment_required"; status is "open" until complete then expires
    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
      return NextResponse.json({ error: "Session not completed" }, { status: 400 })
    }

    const email = session.customer_email || session.metadata?.portalEmail
    if (!email) {
      return NextResponse.json({ error: "No email found in session" }, { status: 400 })
    }

    const token = await signPortalToken(email, "premium")
    return NextResponse.json({ token, email })
  } catch (error) {
    console.error("[Activate] Error:", error)
    return NextResponse.json({ error: "Activation failed" }, { status: 500 })
  }
}
