import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getJobSeeker } from "@/lib/jobs-app-auth"

/**
 * GET /api/jobs-app/subscribe/status
 *
 * Returns the authenticated seeker's current subscription state:
 * tier, status, period end, billing provider, and grandfathered
 * legacy flag (if they signed up for the old Basic portal first).
 */
export async function GET(request: Request) {
  const seeker = await getJobSeeker(request)
  if (!seeker) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check for legacy Basic subscription (grandfathered Pro access)
  const legacy = await prisma.jobSubscription.findUnique({
    where: { email: seeker.email },
    select: {
      status: true,
      stripePriceId: true,
      currentPeriodEnd: true,
      tier: true,
    },
  })

  const hasLegacyActive = legacy?.status === "active"

  // Student bundle
  const hasStudentBundle = !!seeker.planBetaStudentId

  // Effective tier resolution. Note the "pro" branch now also requires
  // subscriptionStatus === "active" — previously a canceled PREMIUM
  // seeker still showed as "pro" in the UI until the webhook downgraded
  // their tier field (A-H3 drift bug).
  const hasActivePro =
    seeker.tier === "PREMIUM" && seeker.subscriptionStatus === "active"

  const effective = hasActivePro
    ? "pro"
    : hasStudentBundle
    ? "student"
    : hasLegacyActive
    ? "grandfathered"
    : "free"

  return NextResponse.json({
    subscription: {
      effective,               // "free" | "pro" | "student" | "grandfathered"
      tier: seeker.tier,       // raw DB enum
      status: seeker.subscriptionStatus ?? "free",
      currentPeriodEnd: seeker.currentPeriodEnd,
      billingProvider: seeker.billingProvider,
      legacy: hasLegacyActive
        ? {
            priceId: legacy?.stripePriceId,
            currentPeriodEnd: legacy?.currentPeriodEnd,
          }
        : null,
      studentLinked: hasStudentBundle,
    },
  })
}
