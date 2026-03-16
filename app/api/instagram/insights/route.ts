import { NextRequest, NextResponse } from "next/server"
import { verifyCronSecret } from "@/lib/api-permissions"
import { checkPermission } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const insightSchema = z.object({
  date: z.string(),
  postsAnalyzed: z.number().int().min(1),
  avgLikes: z.number().min(0),
  avgComments: z.number().min(0),
  avgReelViews: z.number().min(0),
  engagementRate: z.number().min(0),
  bestFormat: z.string().max(50),
  bestDays: z.array(z.string()).default([]),
  bestTimes: z.array(z.string()).default([]),
  topHashtags: z.array(z.string()).default([]),
  dropHashtags: z.array(z.string()).default([]),
  topThemes: z.array(z.string()).default([]),
  retireThemes: z.array(z.string()).default([]),
  weeklyActionItems: z.array(z.string()).default([]),
  fullReport: z.string(),
})

// POST /api/instagram/insights — Receive weekly report from Kimi Claw
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = insightSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const data = parsed.data
  const reportDate = new Date(data.date)

  // Upsert by date — one report per day max
  const existing = await prisma.instagramInsight.findFirst({
    where: {
      date: {
        gte: new Date(reportDate.toISOString().split("T")[0]),
        lt: new Date(new Date(reportDate).setDate(reportDate.getDate() + 1)),
      },
    },
  })

  let insight
  if (existing) {
    insight = await prisma.instagramInsight.update({
      where: { id: existing.id },
      data: {
        postsAnalyzed: data.postsAnalyzed,
        avgLikes: data.avgLikes,
        avgComments: data.avgComments,
        avgReelViews: data.avgReelViews,
        engagementRate: data.engagementRate,
        bestFormat: data.bestFormat,
        bestDays: data.bestDays,
        bestTimes: data.bestTimes,
        topHashtags: data.topHashtags,
        dropHashtags: data.dropHashtags,
        topThemes: data.topThemes,
        retireThemes: data.retireThemes,
        weeklyActionItems: data.weeklyActionItems,
        fullReport: data.fullReport,
      },
    })
  } else {
    insight = await prisma.instagramInsight.create({
      data: {
        date: reportDate,
        postsAnalyzed: data.postsAnalyzed,
        avgLikes: data.avgLikes,
        avgComments: data.avgComments,
        avgReelViews: data.avgReelViews,
        engagementRate: data.engagementRate,
        bestFormat: data.bestFormat,
        bestDays: data.bestDays,
        bestTimes: data.bestTimes,
        topHashtags: data.topHashtags,
        dropHashtags: data.dropHashtags,
        topThemes: data.topThemes,
        retireThemes: data.retireThemes,
        weeklyActionItems: data.weeklyActionItems,
        fullReport: data.fullReport,
      },
    })
  }

  console.log(`[InstagramInsights] Report saved for ${data.date}: ${data.postsAnalyzed} posts, ${data.engagementRate}% ER`)

  return NextResponse.json({
    success: true,
    id: insight.id,
    date: data.date,
  })
}

// GET /api/instagram/insights — Fetch reports for dashboard
export async function GET(request: NextRequest) {
  const auth = await checkPermission("analytics", "read")
  if (!auth.authorized) return auth.response

  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10")

  const insights = await prisma.instagramInsight.findMany({
    orderBy: { date: "desc" },
    take: Math.min(limit, 52),
  })

  return NextResponse.json({ insights })
}
