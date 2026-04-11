import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import type Stripe from "stripe"

function getPeriodEnd(sub: Stripe.Subscription): Date | null {
  const periodEnd = sub.items?.data?.[0]?.current_period_end
  return periodEnd ? new Date(periodEnd * 1000) : null
}

function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent
  if (parent?.subscription_details) {
    const sub = parent.subscription_details.subscription
    if (typeof sub === "string") return sub
    if (sub && typeof sub === "object" && "id" in sub) return sub.id
  }
  return null
}

// POST /api/webhooks/stripe — Handle Stripe webhook events for subscription lifecycle
export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })
  }

  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  // Must use raw text body for signature verification
  const rawBody = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[Stripe Webhook] Signature verification failed:", msg)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== "subscription") break

        const email = session.customer_email
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string
        const metadata = session.metadata || {}

        if (!email) {
          console.error("[Stripe Webhook] No email in checkout session")
          break
        }

        // Fetch subscription details from Stripe
        const sub = await stripe.subscriptions.retrieve(subscriptionId)
        const periodEnd = getPeriodEnd(sub)

        const tier = sub.items.data[0]?.price?.id === process.env.STRIPE_PREMIUM_PRICE_ID ? "premium" : "legacy"

        await prisma.jobSubscription.upsert({
          where: { email },
          create: {
            email,
            name: metadata.name || null,
            whatsapp: metadata.whatsapp || null,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: sub.items.data[0]?.price?.id || null,
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
            name: metadata.name || undefined,
            whatsapp: metadata.whatsapp || undefined,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: sub.items.data[0]?.price?.id || null,
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
        })

        console.log(`[Stripe Webhook] Subscription created for ${email}`)

        // ── Jobs App PWA tier (parallel upsert for JobSeeker) ─────
        // If the checkout originated from the PWA, also mark the
        // JobSeeker as PREMIUM so the PWA auth layer picks it up.
        if (metadata.source === "jobs-app") {
          const seekerEmail = email.toLowerCase()
          await prisma.jobSeeker.updateMany({
            where: { email: seekerEmail },
            data: {
              tier: "PREMIUM",
              subscriptionStatus: "active",
              billingProvider: "stripe",
              stripeCustomerId: customerId,
              subscriptionId: subscriptionId,
              stripePriceId: sub.items.data[0]?.price?.id || null,
              currentPeriodEnd: periodEnd,
            },
          })
          console.log(
            `[Stripe Webhook] JobSeeker upgraded to PRO: ${seekerEmail}`
          )
        }

        break
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription
        const subscriptionId = sub.id
        const periodEnd = getPeriodEnd(sub)

        const existing = await prisma.jobSubscription.findUnique({
          where: { stripeSubscriptionId: subscriptionId },
        })

        if (existing) {
          await prisma.jobSubscription.update({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              status: sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : existing.status,
              ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
            },
          })
          console.log(`[Stripe Webhook] Subscription updated: ${subscriptionId} → ${sub.status}`)
        }

        // ── Jobs App PWA (mirror status on JobSeeker) ─────────────
        const subMetadata = sub.metadata || {}
        if (subMetadata.source === "jobs-app") {
          await prisma.jobSeeker.updateMany({
            where: { subscriptionId: subscriptionId },
            data: {
              subscriptionStatus:
                sub.status === "active"
                  ? "active"
                  : sub.status === "past_due"
                  ? "past_due"
                  : sub.status === "canceled"
                  ? "canceled"
                  : "inactive",
              ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
              ...(sub.status === "canceled" ? { tier: "FREE" } : {}),
            },
          })
          console.log(
            `[Stripe Webhook] JobSeeker status synced: ${subscriptionId} → ${sub.status}`
          )
        }

        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        const subscriptionId = sub.id

        await prisma.jobSubscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: { status: "canceled" },
        })

        // ── Jobs App PWA (downgrade JobSeeker to FREE) ─────────────
        await prisma.jobSeeker.updateMany({
          where: { subscriptionId: subscriptionId },
          data: {
            tier: "FREE",
            subscriptionStatus: "canceled",
          },
        })

        console.log(`[Stripe Webhook] Subscription canceled: ${subscriptionId}`)
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = getSubscriptionIdFromInvoice(invoice)

        if (subscriptionId) {
          await prisma.jobSubscription.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: { status: "past_due" },
          })

          // Jobs App PWA — mirror past_due status
          await prisma.jobSeeker.updateMany({
            where: { subscriptionId: subscriptionId },
            data: { subscriptionStatus: "past_due" },
          })

          console.log(`[Stripe Webhook] Payment failed for subscription: ${subscriptionId}`)
        }
        break
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[Stripe Webhook] Handler error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
