import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { getCachedOrFetch, invalidateCache } from "@/lib/analytics/cache"
import { fetchAllGA4Data } from "@/lib/analytics/ga4"
import { fetchAllGSCData } from "@/lib/analytics/gsc"
import { fetchAllFirstPartyData } from "@/lib/analytics/first-party"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"

const aiLimiter = rateLimit(RATE_LIMITS.AI)

// --- Types ---

interface InsightWin {
  title: string
  detail: string
}

interface InsightConcern {
  title: string
  detail: string
  priority: "high" | "medium" | "low"
}

interface ContentIdea {
  title: string
  description: string
  targetKeyword: string
  expectedImpact: "high" | "medium" | "low"
}

interface CampaignSuggestion {
  channel: string
  action: string
  rationale: string
  estimatedEffort: "low" | "medium" | "high"
}

interface MarketingInsights {
  summary: string
  wins: InsightWin[]
  concerns: InsightConcern[]
  contentIdeas: ContentIdea[]
  campaignSuggestions: CampaignSuggestion[]
  weeklyPriorities: string[]
  generatedAt: string
}

// --- Data Gathering ---

async function getLeadConversionData(days: number) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const [totalLeads, leadsBySource, convertedLeads, leadsByStatus] = await Promise.all([
    prisma.lead.count({ where: { createdAt: { gte: since } } }),
    prisma.lead.groupBy({
      by: ["source"],
      where: { createdAt: { gte: since } },
      _count: { id: true },
    }),
    prisma.lead.count({ where: { createdAt: { gte: since }, converted: true } }),
    prisma.lead.groupBy({
      by: ["status"],
      where: { createdAt: { gte: since } },
      _count: { id: true },
    }),
  ])

  return {
    totalLeads,
    convertedLeads,
    conversionRate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 10000) / 100 : 0,
    bySource: leadsBySource.map((s) => ({ source: s.source, count: s._count.id })),
    byStatus: leadsByStatus.map((s) => ({ status: s.status, count: s._count.id })),
  }
}

// --- Prompt Building ---

function buildPrompt(
  ga4Data: unknown,
  gscData: unknown,
  firstPartyData: unknown,
  leadData: Awaited<ReturnType<typeof getLeadConversionData>>
): string {
  const sections: string[] = []

  sections.push(`## Lead Conversion Data (Last 30 Days)
Total Leads: ${leadData.totalLeads}
Converted Leads: ${leadData.convertedLeads}
Conversion Rate: ${leadData.conversionRate}%

Leads by Source:
${leadData.bySource.map((s) => `- ${s.source}: ${s.count}`).join("\n")}

Leads by Status:
${leadData.byStatus.map((s) => `- ${s.status}: ${s.count}`).join("\n")}`)

  if (ga4Data) {
    sections.push(`## Google Analytics 4 Data (Last 30 Days)
${JSON.stringify(ga4Data, null, 2)}`)
  } else {
    sections.push("## Google Analytics 4 Data\nNot configured or unavailable.")
  }

  if (gscData) {
    sections.push(`## Google Search Console Data (Last 30 Days)
${JSON.stringify(gscData, null, 2)}`)
  } else {
    sections.push("## Google Search Console Data\nNot configured or unavailable.")
  }

  if (firstPartyData) {
    sections.push(`## First-Party UTM & Campaign Data (Last 30 Days)
${JSON.stringify(firstPartyData, null, 2)}`)
  } else {
    sections.push("## First-Party Attribution Data\nNo data available.")
  }

  return sections.join("\n\n")
}

const SYSTEM_PROMPT = `You are a senior digital marketing analyst for Plan Beta (theplanbeta.com), a German language school that primarily serves Indian students who want to learn German (A1, A2, B1, B2 levels) before relocating to Germany for work or study. Plan Beta also runs a student jobs portal for people seeking employment in Germany (engineering, nursing, working student positions).

Your job is to analyze the provided marketing and analytics data and produce specific, actionable insights. Do NOT give generic marketing advice — reference actual numbers, pages, queries, and channels from the data.

Key context:
- Target audience: Indian students aged 20-35 interested in learning German
- Primary funnel: Website visit -> Contact form (lead) -> Trial class -> Enrollment
- Revenue model: Course fees (EUR/INR), plus a student job portal subscription (EUR 4.99/mo)
- Main channels: Instagram, Meta Ads, Google (organic + ads), WhatsApp, referrals
- Primary domain: theplanbeta.com (marketing site at /site path)
- They have city-specific pages (e.g., /site/german-classes/kochi) for Kerala cities
- Blog and content marketing are part of the strategy
- Competition: Other German language institutes in India (Goethe-Institut, MaxMueller, smaller coaching centers)

Respond with ONLY a JSON object (no markdown fences, no explanation) in this exact structure:
{
  "summary": "2-3 sentence overview of current marketing performance",
  "wins": [{"title": "Short title", "detail": "Specific detail with numbers"}],
  "concerns": [{"title": "Short title", "detail": "Specific detail with numbers", "priority": "high|medium|low"}],
  "contentIdeas": [{"title": "Content piece title", "description": "What to write/create", "targetKeyword": "target keyword", "expectedImpact": "high|medium|low"}],
  "campaignSuggestions": [{"channel": "Channel name", "action": "What to do", "rationale": "Why this matters", "estimatedEffort": "low|medium|high"}],
  "weeklyPriorities": ["Priority 1", "Priority 2", "Priority 3", "Priority 4", "Priority 5"]
}`

// --- Generate Insights ---

async function generateInsights(): Promise<MarketingInsights> {
  const [ga4Data, gscData, firstPartyData, leadData] = await Promise.all([
    fetchAllGA4Data(30).catch(() => null),
    fetchAllGSCData(30).catch(() => null),
    fetchAllFirstPartyData(30).catch(() => null),
    getLeadConversionData(30),
  ])

  const dataPrompt = buildPrompt(ga4Data, gscData, firstPartyData, leadData)

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Analyze the following marketing data for Plan Beta and provide actionable insights:\n\n${dataPrompt}`,
      },
    ],
  })

  const textBlock = response.content.find((b) => b.type === "text")
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude")
  }

  // Parse JSON — handle possible markdown fences
  let jsonStr = textBlock.text.trim()
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
  }

  const parsed = JSON.parse(jsonStr)

  return {
    ...parsed,
    generatedAt: new Date().toISOString(),
  }
}

// --- Route Handlers ---

const CACHE_SOURCE = "marketing-insights"
const CACHE_TTL_MINUTES = 720 // 12 hours

export async function GET(request: NextRequest) {
  const rateLimited = await aiLimiter(request)
  if (rateLimited) return rateLimited

  try {
    const check = await checkPermission("analytics", "read")
    if (!check.authorized) return check.response

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        configured: false,
        message: "Add ANTHROPIC_API_KEY environment variable to enable AI marketing insights.",
      })
    }

    const force = request.nextUrl.searchParams.get("force") === "1"

    if (force) {
      await invalidateCache(CACHE_SOURCE)
    }

    const data = await getCachedOrFetch<MarketingInsights>(
      CACHE_SOURCE,
      "30d",
      CACHE_TTL_MINUTES,
      generateInsights
    )

    if (!data) {
      return NextResponse.json(
        { error: "Failed to generate marketing insights" },
        { status: 500 }
      )
    }

    return NextResponse.json({ configured: true, ...data })
  } catch (error) {
    console.error("Marketing insights error:", error)
    return NextResponse.json(
      { error: "Failed to generate marketing insights", details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    const check = await checkPermission("analytics", "read")
    if (!check.authorized) return check.response

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        configured: false,
        message: "Add ANTHROPIC_API_KEY environment variable to enable AI marketing insights.",
      })
    }

    // Invalidate cache and regenerate
    await invalidateCache(CACHE_SOURCE)

    const data = await generateInsights()

    // Store in cache
    const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000)
    await prisma.analyticsCache.upsert({
      where: { source_dateRange: { source: CACHE_SOURCE, dateRange: "30d" } },
      update: { data: data as any, fetchedAt: new Date(), expiresAt },
      create: { source: CACHE_SOURCE, dateRange: "30d", data: data as any, fetchedAt: new Date(), expiresAt },
    })

    return NextResponse.json({ configured: true, ...data })
  } catch (error) {
    console.error("Marketing insights regeneration error:", error)
    return NextResponse.json(
      { error: "Failed to regenerate marketing insights", details: String(error) },
      { status: 500 }
    )
  }
}
