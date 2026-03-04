import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let slug = ""
  for (let i = 0; i < 6; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)]
  }
  return slug
}

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  destination: z.string().min(1, "Destination is required"),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only")
    .min(2)
    .optional()
    .or(z.literal("")),
  utmSource: z.string().min(1, "Source is required"),
  utmMedium: z.string().min(1, "Medium is required"),
  utmCampaign: z.string().min(1, "Campaign is required"),
  utmContent: z.string().optional().or(z.literal("")),
  utmTerm: z.string().optional().or(z.literal("")),
})

// GET /api/utm-links — List all UTM links
export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("utmLinks", "read")
    if (!check.authorized) return check.response

    const { searchParams } = new URL(request.url)
    const campaign = searchParams.get("campaign")
    const source = searchParams.get("source")

    const where: Record<string, unknown> = {}
    if (campaign) where.utmCampaign = { contains: campaign, mode: "insensitive" }
    if (source) where.utmSource = source

    const links = await prisma.utmLink.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })

    const totals = await prisma.utmLink.aggregate({
      _sum: { clickCount: true },
      _count: true,
    })

    return NextResponse.json({
      links,
      totals: {
        count: totals._count,
        totalClicks: totals._sum.clickCount || 0,
      },
    })
  } catch (error) {
    console.error("Error fetching UTM links:", error)
    return NextResponse.json({ error: "Failed to fetch links" }, { status: 500 })
  }
}

// POST /api/utm-links — Create a new UTM link
export async function POST(request: NextRequest) {
  try {
    const check = await checkPermission("utmLinks", "create")
    if (!check.authorized) return check.response

    const body = await request.json()
    const validation = createSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data
    let slug = data.slug || generateSlug()

    // Ensure slug is unique
    const existing = await prisma.utmLink.findUnique({ where: { slug } })
    if (existing) {
      if (data.slug) {
        return NextResponse.json(
          { error: `Slug "${slug}" is already taken. Choose a different one.` },
          { status: 409 }
        )
      }
      // Auto-generated slug collision — regenerate
      slug = generateSlug()
    }

    const link = await prisma.utmLink.create({
      data: {
        name: data.name,
        destination: data.destination,
        slug,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        utmContent: data.utmContent || null,
        utmTerm: data.utmTerm || null,
        createdBy: check.session.user.id,
      },
    })

    return NextResponse.json({ success: true, link }, { status: 201 })
  } catch (error) {
    console.error("Error creating UTM link:", error)
    return NextResponse.json({ error: "Failed to create link" }, { status: 500 })
  }
}
