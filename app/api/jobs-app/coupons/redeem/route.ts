import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireJobSeeker } from "@/lib/jobs-app-auth"
import { checkRateLimit, RL } from "@/lib/jobs-app-rate-limit"

/**
 * POST /api/jobs-app/coupons/redeem
 *
 * Body: { code: string }
 *
 * Validates a JobCoupon code, records the redemption, and upgrades the
 * authenticated seeker to PREMIUM for the coupon's duration. Idempotent —
 * a seeker can only redeem each coupon once (enforced by a unique index
 * on (couponId, seekerId)).
 */

const redeemSchema = z.object({
  code: z.string().trim().min(2).max(64),
})

export async function POST(request: Request) {
  let seeker
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  // Cheap burst rate limit to discourage code-guessing.
  const limited = checkRateLimit(`coupon:${seeker.id}`, RL.COUPON_REDEEM)
  if (limited) return limited

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = redeemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a coupon code." },
      { status: 422 }
    )
  }

  // Codes are stored uppercase; normalise the input.
  const code = parsed.data.code.toUpperCase()

  const coupon = await prisma.jobCoupon.findUnique({ where: { code } })
  if (!coupon) {
    return NextResponse.json(
      { error: "That code isn't valid." },
      { status: 404 }
    )
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "That code has expired." },
      { status: 410 }
    )
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return NextResponse.json(
      { error: "That code has been fully redeemed." },
      { status: 410 }
    )
  }

  const existingRedemption = await prisma.jobCouponRedemption.findUnique({
    where: { couponId_seekerId: { couponId: coupon.id, seekerId: seeker.id } },
  })
  if (existingRedemption) {
    return NextResponse.json(
      { error: "You've already redeemed this code." },
      { status: 409 }
    )
  }

  const now = new Date()
  const accessExpiresAt =
    coupon.durationDays !== null
      ? new Date(now.getTime() + coupon.durationDays * 24 * 60 * 60 * 1000)
      : null

  // Three writes in a transaction so partial failures don't leave the
  // seeker upgraded without a redemption record (or vice-versa).
  await prisma.$transaction([
    prisma.jobCouponRedemption.create({
      data: {
        couponId: coupon.id,
        seekerId: seeker.id,
        expiresAt: accessExpiresAt,
      },
    }),
    prisma.jobCoupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    }),
    prisma.jobSeeker.update({
      where: { id: seeker.id },
      data: {
        tier: coupon.tier,
        subscriptionStatus: "active",
        billingProvider: "coupon",
        // currentPeriodEnd doubles as the "premium until" timestamp; the
        // updated isPremium() check downgrades automatically once it lapses.
        currentPeriodEnd: accessExpiresAt,
      },
    }),
  ])

  return NextResponse.json({
    ok: true,
    tier: coupon.tier,
    expiresAt: accessExpiresAt?.toISOString() ?? null,
  })
}
