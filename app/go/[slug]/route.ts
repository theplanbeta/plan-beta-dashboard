import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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

    // Increment click count before redirecting
    await prisma.utmLink.update({
      where: { id: link.id },
      data: { clicks: { increment: 1 } },
    }).catch(() => {})

    // WhatsApp CTA shortcuts (wa:a1, wa:b2, wa:nurse, etc.)
    if (link.destination.startsWith("wa:")) {
      const message = WA_MESSAGES[link.destination] || WA_MESSAGES["wa:general"]
      const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`
      return NextResponse.redirect(waUrl, 302)
    }

    // External URLs — redirect directly
    if (link.destination.startsWith("http")) {
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
