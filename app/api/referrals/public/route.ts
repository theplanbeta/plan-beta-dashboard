import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { validateReferralCode } from "@/lib/referral-codes"
import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications"
import { sendTemplate, WHATSAPP_TEMPLATES } from "@/lib/whatsapp"
import { trackServerLead } from "@/lib/meta-capi"

const referralLeadSchema = z.object({
  name: z.string().min(1, "Name required"),
  whatsapp: z.string().transform(val => val?.replace(/\+/g, "") || val).pipe(z.string().min(1, "WhatsApp required")),
  email: z.string().email().optional().or(z.literal("")),
  interestedLevel: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  referralCode: z.string().min(1, "Referral code required"),
  landingPage: z.string().optional(),
  visitorId: z.string().optional(),
})

// POST /api/referrals/public — Create a lead with referral attribution (no auth, rate-limited)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = referralLeadSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    // Rate limit: check for duplicate
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const recentLead = await prisma.lead.findFirst({
      where: { whatsapp: data.whatsapp, createdAt: { gte: fiveMinutesAgo } },
    })
    if (recentLead) {
      return NextResponse.json(
        { error: "A submission was already received. Please wait a few minutes." },
        { status: 429 }
      )
    }

    // Validate referral code
    const referral = await validateReferralCode(data.referralCode)
    if (!referral.valid) {
      return NextResponse.json(
        { error: "Invalid referral code" },
        { status: 400 }
      )
    }

    // Create lead with referral attribution
    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        whatsapp: data.whatsapp,
        email: data.email || null,
        source: "REFERRAL",
        status: "NEW",
        quality: "HOT", // Referral leads are high quality
        interestedLevel: (data.interestedLevel || null) as any,
        notes: data.notes || null,
        referralCode: data.referralCode.toUpperCase(),
        firstTouchpoint: data.landingPage || null,
        landingPage: data.landingPage || null,
        visitorId: data.visitorId || null,
        contentInteractions: {
          referralCode: data.referralCode.toUpperCase(),
          referrerId: referral.referrerId,
          referrerName: referral.referrerName,
        },
      },
    })

    // Notification for dashboard
    createNotification({
      type: NOTIFICATION_TYPES.REFERRAL_SIGNUP,
      title: `Referral lead: ${data.name}`,
      message: `Referred by ${referral.referrerName} (${data.referralCode})`,
      metadata: { leadId: lead.id, referrerId: referral.referrerId, referralCode: data.referralCode },
    })

    // WhatsApp to referrer: notify them their friend signed up
    if (referral.referrerId) {
      const referrer = await prisma.student.findUnique({
        where: { id: referral.referrerId },
        select: { whatsapp: true, name: true },
      })
      if (referrer?.whatsapp) {
        sendTemplate(
          referrer.whatsapp,
          WHATSAPP_TEMPLATES.BATCH_ANNOUNCEMENT, // Reuse for referral notification
          [referrer.name, data.name],
          { studentId: referral.referrerId }
        )
      }
    }

    // WhatsApp welcome to the new lead
    sendTemplate(data.whatsapp, WHATSAPP_TEMPLATES.LEAD_WELCOME, [data.name], {
      leadId: lead.id,
    })

    // Meta CAPI
    const eventId = await trackServerLead({
      email: data.email,
      phone: data.whatsapp,
      name: data.name,
      sourceUrl: data.landingPage,
      ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
      visitorId: data.visitorId,
    })

    return NextResponse.json({ success: true, id: lead.id, eventId }, { status: 201 })
  } catch (error) {
    console.error("Failed to create referral lead:", error)
    return NextResponse.json(
      { error: "Failed to submit. Please try again." },
      { status: 500 }
    )
  }
}
