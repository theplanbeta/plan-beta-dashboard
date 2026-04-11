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

        // A-H6: fall back to customer_details.email when customer_email is null
        // (happens when the checkout session is created without a
        // pre-filled email and Stripe collects it on the hosted page).
        const rawEmail = session.customer_email ?? session.customer_details?.email
        // A-C5: lowercase email consistently so every downstream lookup matches
        const email = rawEmail ? rawEmail.toLowerCase() : null
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string
        const metadata = session.metadata || {}

        if (!email) {
          console.error(
            "[Stripe Webhook] No email on checkout session or customer_details"
          )
          break
        }

        // Fetch subscription details from Stripe
        const sub = await stripe.subscriptions.retrieve(subscriptionId)
        const periodEnd = getPeriodEnd(sub)

        // A-H5: Detect Pro tier via the new Day Zero price ids in addition
        // to the legacy STRIPE_PREMIUM_PRICE_ID (EUR 1.99 basic portal).
        const priceId = sub.items.data[0]?.price?.id
        const isPro =
          priceId === process.env.STRIPE_PRO_PRICE_MONTHLY_EU ||
          priceId === process.env.STRIPE_PRO_PRICE_ANNUAL_EU
        const isLegacyPremium = priceId === process.env.STRIPE_PREMIUM_PRICE_ID
        const tier = isPro ? "pro" : isLegacyPremium ? "premium" : "legacy"

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
        // Upgrade the JobSeeker to PREMIUM when the checkout is flagged
        // as coming from the PWA OR when the price matches a Day Zero
        // Pro price id (defence in depth — metadata can be lost if the
        // customer re-enters the flow).
        if (metadata.source === "jobs-app" || isPro) {
          // email is already lowercased above; use it directly
          await prisma.jobSeeker.updateMany({
            where: { email },
            data: {
              tier: "PREMIUM",
              subscriptionStatus: "active",
              billingProvider: "stripe",
              stripeCustomerId: customerId,
              subscriptionId: subscriptionId,
              stripePriceId: priceId ?? null,
              currentPeriodEnd: periodEnd,
            },
          })
          console.log(`[Stripe Webhook] JobSeeker upgraded to PRO: ${email}`)
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

        // A-H1: trialing should be treated as active (user has Pro access
        // during the trial window). Previously it fell through to
        // "existing.status" which left the seeker stuck on the old value.
        const mappedStatus =
          sub.status === "active" || sub.status === "trialing"
            ? "active"
            : sub.status === "past_due"
            ? "past_due"
            : sub.status === "canceled"
            ? "canceled"
            : "inactive"

        if (existing) {
          await prisma.jobSubscription.update({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              status: mappedStatus === "inactive" ? existing.status : mappedStatus,
              ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
            },
          })
          console.log(
            `[Stripe Webhook] Subscription updated: ${subscriptionId} → ${sub.status} (mapped: ${mappedStatus})`
          )
        }

        // ── Jobs App PWA (mirror status on JobSeeker) ─────────────
        // Always try to sync the JobSeeker side, keyed by subscriptionId.
        // updateMany() is a no-op if no seeker matches, so the extra
        // call is free and removes the metadata-loss foot-gun.
        await prisma.jobSeeker.updateMany({
          where: { subscriptionId: subscriptionId },
          data: {
            subscriptionStatus: mappedStatus,
            ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
            ...(sub.status === "canceled" ? { tier: "FREE" } : {}),
          },
        })
        console.log(
          `[Stripe Webhook] JobSeeker status synced: ${subscriptionId} → ${mappedStatus}`
        )

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
