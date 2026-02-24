import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"
import { z } from "zod"

// GET /api/analytics/ad-spend — List ad spend with filters
export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("analytics", "read")
    if (!check.authorized) return check.response

    const { searchParams } = new URL(request.url)
    const platform = searchParams.get("platform")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: Record<string, unknown> = {}
    if (platform) where.platform = platform
    if (startDate || endDate) {
      where.date = {}
      if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate)
      if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate)
    }

    const [records, totals] = await Promise.all([
      prisma.adSpend.findMany({
        where,
        orderBy: { date: "desc" },
        take: 100,
      }),
      prisma.adSpend.aggregate({
        where,
        _sum: { spend: true, impressions: true, clicks: true },
        _count: true,
      }),
    ])

    return NextResponse.json({
      records,
      totals: {
        totalSpend: totals._sum.spend || 0,
        totalImpressions: totals._sum.impressions || 0,
        totalClicks: totals._sum.clicks || 0,
        count: totals._count,
      },
    })
  } catch (error) {
    console.error("Ad spend GET error:", error)
    return NextResponse.json({ error: "Failed to fetch ad spend" }, { status: 500 })
  }
}

const createSchema = z.object({
  platform: z.enum(["META_ADS", "GOOGLE", "INSTAGRAM"]),
  campaignName: z.string().optional(),
  date: z.string().min(1), // YYYY-MM-DD
  spend: z.number().positive(),
  currency: z.enum(["INR", "EUR"]).default("INR"),
  impressions: z.number().int().min(0).default(0),
  clicks: z.number().int().min(0).default(0),
  notes: z.string().optional(),
})

// POST /api/analytics/ad-spend — Create ad spend record (FOUNDER only)
export async function POST(request: NextRequest) {
  try {
    const check = await checkPermission("analytics", "create")
    if (!check.authorized) return check.response

    if (check.session?.user?.role !== "FOUNDER") {
      return NextResponse.json({ error: "FOUNDER access required" }, { status: 403 })
    }

    const body = await request.json()
    const validation = createSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    const record = await prisma.adSpend.upsert({
      where: {
        platform_campaignName_date: {
          platform: data.platform,
          campaignName: data.campaignName || "",
          date: new Date(data.date),
        },
      },
      create: {
        platform: data.platform,
        campaignName: data.campaignName || null,
        date: new Date(data.date),
        spend: data.spend,
        currency: data.currency,
        impressions: data.impressions,
        clicks: data.clicks,
        notes: data.notes,
      },
      update: {
        spend: data.spend,
        currency: data.currency,
        impressions: data.impressions,
        clicks: data.clicks,
        notes: data.notes,
      },
    })

    return NextResponse.json({ success: true, id: record.id }, { status: 201 })
  } catch (error) {
    console.error("Ad spend POST error:", error)
    return NextResponse.json({ error: "Failed to create ad spend" }, { status: 500 })
  }
}
