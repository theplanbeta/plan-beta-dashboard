import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications"
import { trackServerLead } from "@/lib/meta-capi"
import { sendTemplate, WHATSAPP_TEMPLATES } from "@/lib/whatsapp"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"

const limiter = rateLimit(RATE_LIMITS.MODERATE)

// Map UTM source to ReferralSource enum
function mapUtmToSource(utmSource?: string | null): "META_ADS" | "INSTAGRAM" | "GOOGLE" | "ORGANIC" | "REFERRAL" | "OTHER" {
  if (!utmSource) return "ORGANIC"
  const s = utmSource.toLowerCase()
  if (s.includes("facebook") || s.includes("meta")) return "META_ADS"
  if (s === "instagram" || s === "ig") return "INSTAGRAM"
  if (s.includes("google")) return "GOOGLE"
  if (s.includes("referral") || s.includes("friend")) return "REFERRAL"
  return "OTHER"
}

const publicLeadSchema = z.object({
  // Contact fields
  name: z.string().min(1, "Name required"),
  whatsapp: z.string().transform(val => val?.replace(/\+/g, "") || val).pipe(z.string().min(1, "WhatsApp required")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().transform(val => val?.replace(/\+/g, "") || val).optional().or(z.literal("")),

  // Interest fields
  interestedLevel: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),

  // UTM tracking
  utmSource: z.string().optional().or(z.literal("")),
  utmMedium: z.string().optional().or(z.literal("")),
  utmCampaign: z.string().optional().or(z.literal("")),
  utmContent: z.string().optional().or(z.literal("")),
  utmTerm: z.string().optional().or(z.literal("")),

  // Traffic source
  referrerUrl: z.string().optional().or(z.literal("")),
  landingPage: z.string().optional().or(z.literal("")),

  // Device & visitor
  deviceType: z.string().optional().or(z.literal("")),
  visitorId: z.string().optional().or(z.literal("")),

  // Meta cookies for CAPI attribution matching
  fbc: z.string().optional().or(z.literal("")),
  fbp: z.string().optional().or(z.literal("")),
})

// POST /api/leads/public — Unauthenticated lead intake from website
export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await limiter(request)
    if (rateLimitResult) return rateLimitResult

    const body = await request.json()

    const validation = publicLeadSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    // Rate limiting: check for duplicate submission (same whatsapp within 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const recentLead = await prisma.lead.findFirst({
      where: {
        whatsapp: data.whatsapp,
        createdAt: { gte: fiveMinutesAgo },
      },
    })

    if (recentLead) {
      return NextResponse.json(
        { error: "A submission was already received. Please wait a few minutes before trying again." },
        { status: 429 }
      )
    }

    // Derive source from UTM params
    const source = mapUtmToSource(data.utmSource)

    // Build contentInteractions JSON with all attribution data
    const contentInteractions: Record<string, string | undefined> = {}
    if (data.utmSource) contentInteractions.utmSource = data.utmSource
    if (data.utmMedium) contentInteractions.utmMedium = data.utmMedium
    if (data.utmCampaign) contentInteractions.utmCampaign = data.utmCampaign
    if (data.utmContent) contentInteractions.utmContent = data.utmContent
    if (data.utmTerm) contentInteractions.utmTerm = data.utmTerm
    if (data.referrerUrl) contentInteractions.referrer = data.referrerUrl
    if (data.deviceType) contentInteractions.device = data.deviceType

    // Calculate initial lead score based on available data
    const leadScore = calculateLeadScore(source, data)

    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        whatsapp: data.whatsapp,
        email: data.email || null,
        phone: data.phone || null,
        source,
        status: "NEW",
        quality: "WARM",
        interestedLevel: (data.interestedLevel || null) as any,
        notes: data.notes || null,
        leadScore,
        firstTouchpoint: data.landingPage || null,
        contentInteractions: Object.keys(contentInteractions).length > 0 ? contentInteractions : undefined,
        utmSource: data.utmSource || null,
        utmMedium: data.utmMedium || null,
        utmCampaign: data.utmCampaign || null,
        utmContent: data.utmContent || null,
        utmTerm: data.utmTerm || null,
        referrerUrl: data.referrerUrl || null,
        landingPage: data.landingPage || null,
        deviceType: data.deviceType || null,
        visitorId: data.visitorId || null,
      },
    })

    console.log(`📋 Public lead created: ${lead.id} | source=${source} | campaign=${data.utmCampaign || "none"}`)

    // Fire-and-forget notification for dashboard
    createNotification({
      type: NOTIFICATION_TYPES.NEW_LEAD,
      title: `New lead: ${data.name}`,
      message: `Source: ${source}${data.interestedLevel ? ` | Level: ${data.interestedLevel}` : ""}${data.utmCampaign ? ` | Campaign: ${data.utmCampaign}` : ""}`,
      metadata: { leadId: lead.id, source, utmCampaign: data.utmCampaign || null },
    })

    // Fire-and-forget WhatsApp welcome message
    sendTemplate(data.whatsapp, WHATSAPP_TEMPLATES.LEAD_WELCOME, [data.name], {
      leadId: lead.id,
    })

    // Fire-and-forget Meta Conversions API server-side event
    const eventId = await trackServerLead({
      email: data.email,
      phone: data.whatsapp,
      name: data.name,
      sourceUrl: data.landingPage || undefined,
      ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
      visitorId: data.visitorId,
      fbc: data.fbc || undefined,
      fbp: data.fbp || undefined,
    })

    // Fire-and-forget: log conversion event to visitor's PageView timeline
    try {
      if (data.visitorId) {
        await prisma.pageView.create({
          data: {
            visitorId: data.visitorId,
            sessionId: "00000000-0000-0000-0000-000000000000",
            path: "/__conversion/lead",
            country: request.headers.get("x-vercel-ip-country") || undefined,
            deviceType: data.deviceType || undefined,
          },
        })
      }
    } catch {
      // Silent fail — conversion logging is non-critical
    }

    return NextResponse.json({ success: true, id: lead.id, eventId }, { status: 201 })
  } catch (error) {
    console.error("Failed to create public lead:", error)
    return NextResponse.json(
      { error: "Failed to submit. Please try again." },
      { status: 500 }
    )
  }
}

// Auto-populate lead score based on source quality, fields filled, and device type
function calculateLeadScore(
  source: string,
  data: {
    email?: string
    phone?: string
    deviceType?: string
    interestedLevel?: string
    notes?: string
  }
): number {
  let score = 0

  // Source quality (base score)
  const sourceScores: Record<string, number> = {
    REFERRAL: 90,
    GOOGLE: 80,
    INSTAGRAM: 70,
    META_ADS: 60,
    ORGANIC: 50,
    OTHER: 40,
  }
  score += sourceScores[source] || 40

  // Has email (+5)
  if (data.email) score += 5

  // Has phone (+10)
  if (data.phone) score += 10

  // Desktop users tend to be more intentional (+5)
  if (data.deviceType?.toLowerCase() === "desktop") score += 5

  // Course selected shows specificity (+5)
  if (data.interestedLevel) score += 5

  // Provided additional notes (+5)
  if (data.notes && data.notes.length > 10) score += 5

  // Cap at 100
  return Math.min(score, 100)
}
