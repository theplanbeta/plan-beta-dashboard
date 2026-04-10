import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { checkPermission } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"
import { COURSE_PRICING, EXCHANGE_RATE } from "@/lib/pricing"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"

export const maxDuration = 60

const limiter = rateLimit(RATE_LIMITS.AI)

const CFO_SYSTEM_PROMPT = `You are the Virtual CFO of Plan Beta School of German — an online German language school based in Kerala, India, teaching students who want to work, study, or immigrate to Germany.

YOU KNOW THIS BUSINESS INSIDE OUT:
- Courses: A1 (₹14,000/€134), A2 (₹16,000/€156), B1 (₹18,000/€172), B2 (₹22,000/€220), Hybrid A1 (₹10,000), Spoken German (₹12,000)
- Live group classes via Google Meet, 5-10 students per batch, Mon-Fri at 7AM and 5PM CET
- Teachers: 8 part-time, ₹600-750/hr, hourly rate varies by level (stored as JSON)
- Referral reward: ₹2,000 per converted referral (paid after 30-day milestone)
- Job portal: freemium at €4.99/month via Stripe (student jobs in Germany)
- Exchange rate: 1 EUR = ${EXCHANGE_RATE} INR
- Founders: Deepak (neurology resident in Germany, part-time) and Aparna (full-time ops, teaches too)

YOUR MARKET KNOWLEDGE:
- Germany's Fachkräfteeinwanderungsgesetz doubled employment-based residence permits to 420,000
- India leads Opportunity Card issuances (32% of all issued)
- 16,600 Indian nurses in German care facilities; Triple Win Kerala programme runs through Sep 2026
- EU Blue Card minimum salary: €50,700/yr (2026); shortage occupations: €45,934
- Indian language training market growing at 19% CAGR, projected $14B growth by 2030
- EdTech valuations: 8.1x revenue (2025); healthy LTV:CAC ratio >3:1

YOUR IPO AWARENESS:
- SEBI SME IPO needs: ₹2.5Cr+ PAT (consistent 2-3 years), ₹3Cr net tangible assets, 3yr audited financials
- Target: SME IPO by 2029-2030
- Current stage: Foundation year — proving unit economics, building audit trail
- Revenue diversification needed: live courses alone can't reach IPO scale
- Key growth levers: A1→A2 progression (currently ~12%, target 25%), B2B corporate training, recorded courses, placement fees

YOUR PERSONALITY:
- You are conservative and data-driven. Flag assumptions explicitly.
- Lead with the decision, then the data. "Don't launch this batch" before the numbers.
- Think in scenarios: best case, realistic case, worst case.
- Proactively surface problems before they become crises.
- Celebrate wins but ask "is this sustainable?"
- Use ₹ for Indian context, € for international. The team thinks in INR.
- When data is insufficient, say exactly what's missing and how to collect it.
- Keep responses focused and actionable. No fluff, no jargon without explanation.
- You are talking to the founder directly. Be direct, even blunt when needed.

YOUR DECISION FRAMEWORK:
For every financial question, structure your thinking as:
1. THE NUMBERS — What does the data say?
2. THE RISK — What could go wrong? How likely?
3. THE RECOMMENDATION — What should we do?
4. THE ALTERNATIVE — What's the conservative option?
5. THE METRIC TO WATCH — How do we know if this is working?

CRITICAL RULES:
- NEVER recommend launching a batch with <5 students (A1/A2) or <6 students (B1/B2)
- ALWAYS flag when an action would reduce margins below 15%
- ALWAYS present worst-case alongside optimistic projections
- Distinguish revenue (cash received) from enrolled (committed but unpaid)
- In a small business, ₹5,000 matters. Track every rupee.

DATA QUALITY NOTES:
- PageView visitor tracking deployed April 2026. Touchpoint-before-conversion analysis only covers leads created after deployment.
- Only visitors who accepted cookie consent are tracked. Actual traffic is higher than tracked pageviews.

You will receive live business data as context with each message. Use it to give specific, number-backed answers. Reference actual batch codes, student counts, and rupee amounts — never speak in generalities when you have the data.`

// Aggregate fresh business data for the CFO
async function getCfoContext() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [
    students,
    recentPayments,
    todayPayments,
    batches,
    leads,
    teacherHours,
    expenses,
    referrals,
    adSpend,
    jobSubscriptions,
    totalPageViews,
    topPages,
  ] = await Promise.all([
    // All students with financial data
    prisma.student.findMany({
      select: {
        studentId: true,
        name: true,
        currentLevel: true,
        completionStatus: true,
        churnRisk: true,
        paymentStatus: true,
        totalPaid: true,
        totalPaidEur: true,
        balance: true,
        finalPrice: true,
        currency: true,
        isCombo: true,
        referralSource: true,
        attendanceRate: true,
        enrollmentDate: true,
        consecutiveAbsences: true,
      },
    }),
    // Payments last 30 days
    prisma.payment.findMany({
      where: { paymentDate: { gte: thirtyDaysAgo }, status: "COMPLETED" },
      select: { amount: true, currency: true, paymentDate: true },
    }),
    // Payments today
    prisma.payment.findMany({
      where: { paymentDate: { gte: today }, status: "COMPLETED" },
      select: { amount: true, currency: true },
    }),
    // All active/filling/planning batches
    prisma.batch.findMany({
      where: { status: { in: ["RUNNING", "FILLING", "PLANNING", "FULL"] } },
      select: {
        batchCode: true,
        level: true,
        status: true,
        totalSeats: true,
        startDate: true,
        endDate: true,
        timing: true,
        teacher: { select: { name: true } },
        _count: { select: { enrollments: true } },
      },
    }),
    // Leads last 30 days
    prisma.lead.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { source: true, status: true, quality: true, converted: true },
    }),
    // Teacher hours last 30 days
    prisma.teacherHours.findMany({
      where: { date: { gte: thirtyDaysAgo }, status: "APPROVED" },
      select: { totalAmount: true, hoursWorked: true, paid: true },
    }),
    // Active recurring expenses
    prisma.expense.findMany({
      where: { isActive: true },
      select: { name: true, amount: true, currency: true, category: true, type: true },
    }),
    // Referrals
    prisma.referral.findMany({
      where: { referralDate: { gte: thirtyDaysAgo } },
      select: { payoutStatus: true, payoutAmount: true, enrollmentDate: true },
    }),
    // Ad spend last 30 days
    prisma.adSpend.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      select: { platform: true, spend: true, currency: true, impressions: true, clicks: true },
    }),
    // Job portal subscribers
    prisma.jobSubscription.count({ where: { status: "active" } }),
    // PageView analytics (identity resolution data)
    prisma.pageView.count({ where: { deletedAt: null } }),
    prisma.pageView.groupBy({
      by: ["path"],
      where: { deletedAt: null },
      _count: true,
      orderBy: { _count: { path: "desc" } },
      take: 10,
    }),
  ])

  // Compute aggregates
  const activeStudents = students.filter(s => s.completionStatus === "ACTIVE")
  const overdueStudents = students.filter(s => s.paymentStatus === "OVERDUE")
  const highRiskStudents = students.filter(s => s.churnRisk === "HIGH")

  const toEur = (amount: number, currency: string) =>
    currency === "INR" ? amount / EXCHANGE_RATE : amount

  const monthRevenue = recentPayments.reduce(
    (sum, p) => sum + toEur(Number(p.amount), p.currency), 0
  )
  const todayRevenue = todayPayments.reduce(
    (sum, p) => sum + toEur(Number(p.amount), p.currency), 0
  )
  const monthRevenueInr = Math.round(monthRevenue * EXCHANGE_RATE)

  const totalOutstanding = students.reduce(
    (sum, s) => sum + Math.max(0, Number(s.balance || 0)), 0
  )

  const teacherCostInr = teacherHours.reduce(
    (sum, h) => sum + Number(h.totalAmount || 0), 0
  )
  const totalTeacherHours = teacherHours.reduce(
    (sum, h) => sum + Number(h.hoursWorked || 0), 0
  )

  const monthlyExpenses = expenses
    .filter(e => e.type === "RECURRING")
    .reduce((sum, e) => {
      const amt = Number(e.amount)
      return sum + (e.currency === "EUR" ? amt * EXCHANGE_RATE : amt)
    }, 0)

  const totalAdSpend = adSpend.reduce((sum, a) => {
    const amt = Number(a.spend)
    return sum + (a.currency === "EUR" ? amt * EXCHANGE_RATE : amt)
  }, 0)

  const totalLeads = leads.length
  const convertedLeads = leads.filter(l => l.converted).length

  const batchSummaries = batches.map(b => {
    const enrolled = b._count.enrollments
    const level = b.level as keyof typeof COURSE_PRICING
    const priceInr = COURSE_PRICING[level]?.INR || 14000
    return {
      code: b.batchCode,
      level: b.level,
      status: b.status,
      enrolled,
      seats: b.totalSeats,
      fillRate: `${Math.round((enrolled / b.totalSeats) * 100)}%`,
      teacher: b.teacher?.name || "Unassigned",
      timing: b.timing,
      startDate: b.startDate?.toISOString().split("T")[0],
      revenueEstimate: `₹${(enrolled * priceInr).toLocaleString("en-IN")}`,
    }
  })

  // Level distribution
  const levelDist: Record<string, number> = {}
  for (const s of activeStudents) {
    levelDist[s.currentLevel] = (levelDist[s.currentLevel] || 0) + 1
  }

  // Source distribution
  const sourceDist: Record<string, number> = {}
  for (const s of students) {
    const src = s.referralSource || "UNKNOWN"
    sourceDist[src] = (sourceDist[src] || 0) + 1
  }

  const monthlyBurn = teacherCostInr + monthlyExpenses + totalAdSpend
  const runwayMonths = monthlyBurn > 0 ? monthRevenueInr / monthlyBurn : 0

  return `LIVE BUSINESS DATA (as of ${now.toISOString().split("T")[0]}):

REVENUE:
- Today: ₹${Math.round(todayRevenue * EXCHANGE_RATE).toLocaleString("en-IN")} (€${Math.round(todayRevenue)})
- Last 30 days: ₹${monthRevenueInr.toLocaleString("en-IN")} (€${Math.round(monthRevenue)})
- Payments received (30d): ${recentPayments.length}

OUTSTANDING & OVERDUE:
- Total outstanding balance: ₹${Math.round(totalOutstanding).toLocaleString("en-IN")}
- Students with OVERDUE status: ${overdueStudents.length} (₹${Math.round(overdueStudents.reduce((s, st) => s + Number(st.balance || 0), 0)).toLocaleString("en-IN")})

STUDENTS:
- Total: ${students.length} | Active: ${activeStudents.length}
- High churn risk: ${highRiskStudents.length}
- Level distribution (active): ${JSON.stringify(levelDist)}
- Acquisition source: ${JSON.stringify(sourceDist)}
- Avg attendance rate: ${Math.round(activeStudents.reduce((s, st) => s + Number(st.attendanceRate || 0), 0) / (activeStudents.length || 1))}%

BATCHES:
${batchSummaries.map(b => `- ${b.code} [${b.status}]: ${b.enrolled}/${b.seats} students (${b.fillRate}), teacher: ${b.teacher}, starts: ${b.startDate || "TBD"}, est. revenue: ${b.revenueEstimate}`).join("\n")}

LEADS (last 30 days):
- Total: ${totalLeads} | Converted: ${convertedLeads} | Conversion rate: ${totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0}%

COSTS (last 30 days):
- Teacher costs: ₹${Math.round(teacherCostInr).toLocaleString("en-IN")} (${Math.round(totalTeacherHours)} hours)
- Monthly recurring expenses: ₹${Math.round(monthlyExpenses).toLocaleString("en-IN")}
- Ad spend (30d): ₹${Math.round(totalAdSpend).toLocaleString("en-IN")}
- Total monthly burn: ₹${Math.round(monthlyBurn).toLocaleString("en-IN")}

REFERRALS (last 30 days):
- New referrals: ${referrals.length}
- Converted: ${referrals.filter(r => r.enrollmentDate).length}
- Pending payouts: ${referrals.filter(r => r.payoutStatus === "PENDING").length}

JOB PORTAL:
- Active premium subscribers: ${jobSubscriptions}
- MRR: €${(jobSubscriptions * 4.99).toFixed(2)} (₹${Math.round(jobSubscriptions * 4.99 * EXCHANGE_RATE).toLocaleString("en-IN")})

HEALTH INDICATORS:
- Revenue vs burn ratio: ${runwayMonths.toFixed(1)}x
- Gross margin estimate: ${monthRevenueInr > 0 ? Math.round(((monthRevenueInr - teacherCostInr) / monthRevenueInr) * 100) : 0}%
- CAC (blended, if ${totalAdSpend > 0 ? "known" : "no ad data"}): ${convertedLeads > 0 ? `₹${Math.round(totalAdSpend / convertedLeads).toLocaleString("en-IN")}` : "insufficient data"}

WEBSITE VISITOR TRACKING (since pixel deployment):
- Total tracked pageviews: ${totalPageViews}
- Top pages: ${topPages.slice(0, 5).map((p: { path: string; _count: number }) => `${p.path} (${p._count} views)`).join(", ") || "No data yet"}
- Note: PageView tracking data available from April 2026. Touchpoint analysis only covers leads created after this date.`
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export async function POST(request: NextRequest) {
  const rateLimited = await limiter(request)
  if (rateLimited) return rateLimited

  const auth = await checkPermission("insights", "read")
  if (!auth.authorized) return auth.response

  try {
    const { messages, conversationId } = (await request.json()) as { messages: ChatMessage[]; conversationId?: string }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages array required" }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 })
    }

    // Fetch live business data
    const businessContext = await getCfoContext()

    // Inject business data into the first user message as context
    const enrichedMessages = messages.map((msg, i) => ({
      role: msg.role as "user" | "assistant",
      content: i === messages.length - 1 && msg.role === "user"
        ? `[LIVE DATA]\n${businessContext}\n[/LIVE DATA]\n\nFounder's question: ${msg.content}`
        : msg.content,
    }))

    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: CFO_SYSTEM_PROMPT,
      messages: enrichedMessages,
    })

    const textContent = response.content.find(c => c.type === "text")
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json({ error: "No response generated" }, { status: 500 })
    }

    // Persist conversation
    const userId = auth.session.user.id
    const now = new Date().toISOString()
    const updatedMessages = [
      ...messages.map(m => ({ role: m.role, content: m.content, timestamp: now })),
      { role: "assistant" as const, content: textContent.text, timestamp: now },
    ]

    let savedConversationId = conversationId
    try {
      if (conversationId) {
        await prisma.cfoConversation.update({
          where: { id: conversationId },
          data: { messages: updatedMessages },
        })
      } else {
        const firstUserMessage = messages.find(m => m.role === "user")
        const title = firstUserMessage
          ? firstUserMessage.content.slice(0, 100)
          : "New conversation"
        const conversation = await prisma.cfoConversation.create({
          data: {
            userId,
            title,
            messages: updatedMessages,
          },
        })
        savedConversationId = conversation.id
      }
    } catch (persistError) {
      console.error("[CFO Chat] Failed to persist conversation:", persistError)
      // Don't fail the request if persistence fails
    }

    return NextResponse.json({
      reply: textContent.text,
      conversationId: savedConversationId,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    })
  } catch (error) {
    console.error("[CFO Chat] Error:", error)
    return NextResponse.json({ error: "Failed to generate CFO response" }, { status: 500 })
  }
}
