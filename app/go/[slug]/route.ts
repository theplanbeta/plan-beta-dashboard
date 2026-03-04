import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { parseUserAgent } from "@/lib/ua-parser"

const ALLOWED_REDIRECT_DOMAINS = [
  "theplanbeta.com",
  "planbeta.app",
  "planbeta.in",
  "courses.planbeta.in",
  "wa.me",
  "api.whatsapp.com",
  "instagram.com",
  "www.instagram.com",
  "facebook.com",
  "www.facebook.com",
  "youtube.com",
  "www.youtube.com",
  "shopify.com",
]

function isAllowedRedirect(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false
    const hostname = parsed.hostname.toLowerCase()
    return ALLOWED_REDIRECT_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith(`.${d}`)
    )
  } catch {
    return false
  }
}

const WA_NUMBER = "919028396035"
const WA_MESSAGES: Record<string, string> = {
  "wa:a1": "Hi! I'm interested in the A1 German course.",
  "wa:a2": "Hi! I'm interested in the A2 German course.",
  "wa:b1": "Hi! I'm interested in the B1 German course.",
  "wa:b2": "Hi! I'm interested in the B2 German course.",
  "wa:nurse": "Hi! I'm a nurse interested in learning German.",
  "wa:general": "Hi Plan Beta! I'm interested in learning German.",
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  try {
    const link = await prisma.utmLink.findUnique({ where: { slug } })

    if (!link) {
      return NextResponse.redirect(new URL("/site", request.url))
    }

    // Capture click details from request headers
    const country = request.headers.get("x-vercel-ip-country") || null
    const region = request.headers.get("x-vercel-ip-country-region") || null
    const city = request.headers.get("x-vercel-ip-city") || null
    const rawReferrer = request.headers.get("referer") || null
    const ua = request.headers.get("user-agent") || ""
    const { deviceType, browser, os } = parseUserAgent(ua)

    // Truncate referrer to domain only (privacy)
    let referrer: string | null = null
    if (rawReferrer) {
      try {
        referrer = new URL(rawReferrer).hostname
      } catch {
        referrer = rawReferrer.slice(0, 100)
      }
    }

    // Fire-and-forget: increment counter + store click detail
    prisma.$transaction([
      prisma.utmLink.update({
        where: { id: link.id },
        data: { clickCount: { increment: 1 } },
      }),
      prisma.linkClick.create({
        data: { linkId: link.id, country, region, city, deviceType, browser, os, referrer },
      }),
    ]).catch(() => {})

    // WhatsApp CTA shortcuts (wa:a1, wa:b2, wa:nurse, etc.)
    if (link.destination.startsWith("wa:")) {
      const message = WA_MESSAGES[link.destination] || WA_MESSAGES["wa:general"]
      const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`
      return NextResponse.redirect(waUrl, 302)
    }

    // External URLs — redirect only to allowed domains
    if (link.destination.startsWith("http")) {
      if (!isAllowedRedirect(link.destination)) {
        return NextResponse.redirect(new URL("/site", request.url))
      }
      return NextResponse.redirect(link.destination, 302)
    }

    // Internal URLs — build full URL with UTM params
    const base = new URL(link.destination, request.url)
    base.searchParams.set("utm_source", link.utmSource)
    base.searchParams.set("utm_medium", link.utmMedium)
    base.searchParams.set("utm_campaign", link.utmCampaign)
    if (link.utmContent) base.searchParams.set("utm_content", link.utmContent)
    if (link.utmTerm) base.searchParams.set("utm_term", link.utmTerm)

    return NextResponse.redirect(base.toString(), 302)
  } catch {
    return NextResponse.redirect(new URL("/site", request.url))
  }
}
