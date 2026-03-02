import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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

    // Increment click count (fire-and-forget)
    prisma.utmLink.update({
      where: { id: link.id },
      data: { clicks: { increment: 1 } },
    }).catch(() => {})

    // Build full URL with UTM params
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
