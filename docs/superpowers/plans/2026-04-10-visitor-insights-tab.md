# Visitor Insights Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Visitors" tab to the website analytics dashboard showing conversion funnels, content effectiveness, daily trends, and lead journey timelines — all powered by the PageView model.

**Architecture:** One new API route aggregates all PageView + Lead data server-side, returning pre-computed JSON. Three new UI components (tab, funnel, journey viewer) follow the existing tab pattern (native fetch + useState). The page.tsx gets a 6th tab entry + endpoint.

**Tech Stack:** Next.js 15 App Router, Prisma (Neon PostgreSQL), Tailwind CSS, existing MetricCard + LineChart components.

**Spec:** `docs/superpowers/specs/2026-04-10-visitor-insights-tab-design.md`

**No test framework** is installed. Verification via manual curl + browser inspection.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `components/charts/PeriodSelector.tsx` | Modify | Add 14d preset |
| `app/api/analytics/website/visitor-insights/route.ts` | Create | All server-side aggregation queries |
| `app/dashboard/website-analytics/components/ConversionFunnel.tsx` | Create | Horizontal bar funnel visualization |
| `app/dashboard/website-analytics/components/LeadJourneyViewer.tsx` | Create | Dropdown + vertical timeline |
| `app/dashboard/website-analytics/components/VisitorInsightsTab.tsx` | Create | Main tab component composing all sections |
| `app/dashboard/website-analytics/page.tsx` | Modify | Add 6th tab + endpoint |

---

### Task 1: Add 14d Preset to PeriodSelector

**Files:**
- Modify: `components/charts/PeriodSelector.tsx:10-17`

- [ ] **Step 1: Add 14d preset**

In `components/charts/PeriodSelector.tsx`, find the `PRESETS` array (lines 10-17):

```typescript
const PRESETS: PeriodPreset[] = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "180d", days: 180 },
  { label: "365d", days: 365 },
  { label: "All", days: 0 },
]
```

Change it to:

```typescript
const PRESETS: PeriodPreset[] = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "180d", days: 180 },
  { label: "365d", days: 365 },
  { label: "All", days: 0 },
]
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "PeriodSelector" | head -5`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/charts/PeriodSelector.tsx
git commit -m "feat: add 14d preset to period selector"
```

---

### Task 2: Create Visitor Insights API Route

**Files:**
- Create: `app/api/analytics/website/visitor-insights/route.ts`

- [ ] **Step 1: Create the API route**

Create `app/api/analytics/website/visitor-insights/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"

const NIL_UUID = "00000000-0000-0000-0000-000000000000"

export async function GET(request: NextRequest) {
  const auth = await checkPermission("analytics", "read")
  if (!auth.authorized) return auth.response

  const userRole = auth.session.user.role

  const periodDays = parseInt(request.nextUrl.searchParams.get("period") || "30", 10)
  const now = new Date()
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Base filter: in period, not deleted, not conversion sentinel
  const baseWhere = {
    deletedAt: null,
    timestamp: { gte: periodStart },
    sessionId: { not: NIL_UUID },
  }

  const [
    totalPageViews,
    uniqueVisitorIds,
    sessionGroups,
    durationStats,
    dailyCounts,
    topPages,
    allVisitorIdsInPeriod,
    priorVisitorIds,
    convertedLeads,
  ] = await Promise.all([
    // Total pageviews
    prisma.pageView.count({ where: baseWhere }),

    // Unique visitors
    prisma.pageView.groupBy({
      by: ["visitorId"],
      where: baseWhere,
    }),

    // Session grouping for avg pages/session
    prisma.pageView.groupBy({
      by: ["sessionId"],
      where: baseWhere,
      _count: true,
    }),

    // Duration stats (only non-null)
    prisma.pageView.aggregate({
      where: { ...baseWhere, duration: { not: null } },
      _avg: { duration: true },
      _count: { duration: true },
    }),

    // Daily pageview counts (last 7 days, regardless of period)
    prisma.pageView.groupBy({
      by: ["timestamp"],
      where: {
        deletedAt: null,
        timestamp: { gte: sevenDaysAgo },
        sessionId: { not: NIL_UUID },
      },
      _count: true,
    }),

    // Top pages by pageview count (excluding conversion sentinel)
    prisma.pageView.groupBy({
      by: ["path"],
      where: {
        ...baseWhere,
        path: { not: "/__conversion/lead" },
      },
      _count: true,
      _avg: { duration: true, scrollDepth: true },
      orderBy: { _count: { path: "desc" } },
      take: 10,
    }),

    // All unique visitorIds in period (for funnel)
    prisma.pageView.groupBy({
      by: ["visitorId"],
      where: baseWhere,
    }),

    // Visitor IDs that have pageviews BEFORE the period start (returning visitors)
    prisma.pageView.groupBy({
      by: ["visitorId"],
      where: {
        deletedAt: null,
        timestamp: { lt: periodStart },
        sessionId: { not: NIL_UUID },
      },
    }),

    // Leads with visitorId (for converted + journeys)
    prisma.lead.findMany({
      where: {
        visitorId: { not: null },
        createdAt: { gte: periodStart },
      },
      select: {
        id: true,
        name: true,
        source: true,
        visitorId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ])

  // Compute KPIs
  const uniqueVisitors = uniqueVisitorIds.length
  const avgPagesPerSession = sessionGroups.length > 0
    ? Math.round((totalPageViews / sessionGroups.length) * 10) / 10
    : 0
  const durationSampleSize = durationStats._count.duration
  const avgDurationPerPage = durationSampleSize >= 10
    ? Math.round(durationStats._avg.duration || 0)
    : null

  // Daily pageview trend (aggregate by date)
  const dailyMap = new Map<string, number>()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    dailyMap.set(d.toISOString().split("T")[0], 0)
  }
  for (const row of dailyCounts) {
    const dateKey = new Date(row.timestamp).toISOString().split("T")[0]
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + row._count)
  }
  const dailyPageViews = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }))

  // Funnel
  const allVisitorSet = new Set(allVisitorIdsInPeriod.map((v) => v.visitorId))
  const priorVisitorSet = new Set(priorVisitorIds.map((v) => v.visitorId))
  const returningVisitors = [...allVisitorSet].filter((id) => priorVisitorSet.has(id)).length
  const convertedVisitorIds = new Set(convertedLeads.map((l) => l.visitorId).filter(Boolean))
  const convertedVisitors = [...allVisitorSet].filter((id) => convertedVisitorIds.has(id)).length

  const funnel = {
    totalVisitors: allVisitorSet.size,
    returningVisitors,
    convertedVisitors,
    visitToReturnRate: allVisitorSet.size > 0 ? Math.round((returningVisitors / allVisitorSet.size) * 100) : 0,
    returnToConvertRate: returningVisitors > 0 ? Math.round((convertedVisitors / returningVisitors) * 100) : 0,
    visitToConvertRate: allVisitorSet.size > 0 ? Math.round((convertedVisitors / allVisitorSet.size) * 100) : 0,
  }

  // Top pages formatted
  const formattedTopPages = topPages.map((p) => ({
    path: p.path,
    pageviews: p._count,
    avgDuration: p._avg.duration ? Math.round(p._avg.duration) : null,
    avgScrollDepth: p._avg.scrollDepth ? Math.round(p._avg.scrollDepth) : null,
  }))

  // Top conversion paths: last page before conversion for each converted lead
  const convertedVisitorIdList = convertedLeads
    .map((l) => l.visitorId)
    .filter((id): id is string => id !== null)

  let topConversionPaths: Array<{ path: string; conversions: number }> = []
  if (convertedVisitorIdList.length > 0) {
    // Get last non-conversion pageview per converted visitor
    const lastPages = await prisma.pageView.findMany({
      where: {
        visitorId: { in: convertedVisitorIdList },
        deletedAt: null,
        sessionId: { not: NIL_UUID },
        path: { not: "/__conversion/lead" },
      },
      orderBy: { timestamp: "desc" },
      select: { visitorId: true, path: true },
    })

    // Take first (most recent) per visitor
    const seenVisitors = new Set<string>()
    const pathCounts = new Map<string, number>()
    for (const pv of lastPages) {
      if (seenVisitors.has(pv.visitorId)) continue
      seenVisitors.add(pv.visitorId)
      pathCounts.set(pv.path, (pathCounts.get(pv.path) || 0) + 1)
    }

    topConversionPaths = Array.from(pathCounts.entries())
      .map(([path, conversions]) => ({ path, conversions }))
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 5)
  }

  // Lead journeys — single query for all pageviews, then group client-side
  let leadJourneys: Array<{
    leadId: string
    leadName: string
    leadSource: string
    convertedAt: string
    pages: Array<{ path: string; duration: number | null; scrollDepth: number | null; timestamp: string }>
  }> = []

  if (convertedLeads.length > 0) {
    const journeyPageViews = await prisma.pageView.findMany({
      where: {
        visitorId: { in: convertedVisitorIdList },
        deletedAt: null,
        sessionId: { not: NIL_UUID },
      },
      orderBy: { timestamp: "asc" },
      select: {
        visitorId: true,
        path: true,
        duration: true,
        scrollDepth: true,
        timestamp: true,
      },
    })

    // Group by visitorId
    const pvByVisitor = new Map<string, typeof journeyPageViews>()
    for (const pv of journeyPageViews) {
      const list = pvByVisitor.get(pv.visitorId) || []
      list.push(pv)
      pvByVisitor.set(pv.visitorId, list)
    }

    leadJourneys = convertedLeads.map((lead, index) => ({
      leadId: lead.id,
      leadName: userRole === "FOUNDER" ? lead.name : `Lead #${index + 1}`,
      leadSource: lead.source,
      convertedAt: lead.createdAt.toISOString(),
      pages: (pvByVisitor.get(lead.visitorId!) || []).map((pv) => ({
        path: pv.path,
        duration: pv.duration,
        scrollDepth: pv.scrollDepth,
        timestamp: pv.timestamp.toISOString(),
      })),
    }))
  }

  return NextResponse.json({
    totalPageViews,
    uniqueVisitors,
    avgPagesPerSession,
    avgDurationPerPage,
    durationSampleSize,
    dailyPageViews,
    funnel,
    topPages: formattedTopPages,
    topConversionPaths,
    leadJourneys,
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "visitor-insights" | head -5`

Expected: No errors.

- [ ] **Step 3: Manual test**

Start dev server, then:

```bash
curl -s http://localhost:3000/api/analytics/website/visitor-insights?period=30 \
  -H "Cookie: YOUR_SESSION_COOKIE" | python3 -m json.tool | head -30
```

Expected: JSON with all fields (most will be 0 or empty arrays on fresh data).

- [ ] **Step 4: Commit**

```bash
git add app/api/analytics/website/visitor-insights/route.ts
git commit -m "feat: add visitor insights API route with funnel, top pages, lead journeys"
```

---

### Task 3: Create ConversionFunnel Component

**Files:**
- Create: `app/dashboard/website-analytics/components/ConversionFunnel.tsx`

- [ ] **Step 1: Create the funnel component**

Create `app/dashboard/website-analytics/components/ConversionFunnel.tsx`:

```typescript
"use client"

type FunnelData = {
  totalVisitors: number
  returningVisitors: number
  convertedVisitors: number
  visitToReturnRate: number
  returnToConvertRate: number
  visitToConvertRate: number
}

export default function ConversionFunnel({ data }: { data: FunnelData }) {
  if (data.totalVisitors === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No visitor data yet — collecting...</p>
      </div>
    )
  }

  const bars = [
    {
      label: "Total Visitors",
      value: data.totalVisitors,
      percent: 100,
      color: "bg-blue-500",
    },
    {
      label: "Returning",
      value: data.returningVisitors,
      percent: data.visitToReturnRate,
      color: "bg-amber-500",
    },
    {
      label: "Converted",
      value: data.convertedVisitors,
      percent: data.visitToConvertRate,
      color: "bg-green-500",
    },
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Conversion Funnel</h3>
      <div className="space-y-4">
        {bars.map((bar, i) => (
          <div key={bar.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-gray-700 dark:text-gray-300">{bar.label}</span>
              <span className="text-gray-500 dark:text-gray-400">
                {bar.value.toLocaleString()} ({bar.percent}%)
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-6">
              <div
                className={`${bar.color} h-6 rounded-full transition-all duration-500`}
                style={{ width: `${Math.max(bar.percent, 2)}%` }}
              />
            </div>
            {i < bars.length - 1 && (
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
                {i === 0 ? `${data.visitToReturnRate}% return` : `${data.returnToConvertRate}% convert`}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "ConversionFunnel" | head -5`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/website-analytics/components/ConversionFunnel.tsx
git commit -m "feat: add ConversionFunnel component for visitor insights"
```

---

### Task 4: Create LeadJourneyViewer Component

**Files:**
- Create: `app/dashboard/website-analytics/components/LeadJourneyViewer.tsx`

- [ ] **Step 1: Create the journey viewer component**

Create `app/dashboard/website-analytics/components/LeadJourneyViewer.tsx`:

```typescript
"use client"

import { useState } from "react"

type PageVisit = {
  path: string
  duration: number | null
  scrollDepth: number | null
  timestamp: string
}

type LeadJourney = {
  leadId: string
  leadName: string
  leadSource: string
  convertedAt: string
  pages: PageVisit[]
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—"
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return "Just now"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return "1 day ago"
  return `${days} days ago`
}

export default function LeadJourneyViewer({ journeys }: { journeys: LeadJourney[] }) {
  const [selectedIdx, setSelectedIdx] = useState(0)

  if (journeys.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No lead journeys available yet.</p>
      </div>
    )
  }

  const journey = journeys[selectedIdx]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Lead Journey Viewer</h3>

      {/* Lead selector */}
      <select
        value={selectedIdx}
        onChange={(e) => setSelectedIdx(Number(e.target.value))}
        className="w-full mb-4 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
      >
        {journeys.map((j, i) => (
          <option key={j.leadId} value={i}>
            {j.leadName} — {j.leadSource} — {new Date(j.convertedAt).toLocaleDateString()}
          </option>
        ))}
      </select>

      {/* Timeline */}
      {journey.pages.length === 0 ? (
        <p className="text-sm text-gray-400">No pageview data for this lead.</p>
      ) : (
        <div className="relative ml-3">
          {journey.pages.map((page, i) => (
            <div key={`${page.path}-${page.timestamp}`} className="flex items-start mb-4 last:mb-0">
              {/* Timeline line + dot */}
              <div className="flex flex-col items-center mr-4">
                <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-gray-800 z-10" />
                {i < journey.pages.length - 1 && (
                  <div className="w-0.5 flex-1 bg-gray-300 dark:bg-gray-600 min-h-[24px]" />
                )}
              </div>
              {/* Content */}
              <div className="flex-1 -mt-0.5">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                  {page.path}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 space-x-3">
                  <span>{formatRelativeTime(page.timestamp)}</span>
                  {page.duration !== null && <span>{formatDuration(page.duration)}</span>}
                  {page.scrollDepth !== null && <span>{page.scrollDepth}% scrolled</span>}
                </div>
              </div>
            </div>
          ))}
          {/* Conversion marker */}
          <div className="flex items-start">
            <div className="flex flex-col items-center mr-4">
              <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-800 z-10" />
            </div>
            <div className="flex-1 -mt-0.5">
              <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                Converted to Lead
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {formatRelativeTime(journey.convertedAt)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "LeadJourneyViewer" | head -5`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/website-analytics/components/LeadJourneyViewer.tsx
git commit -m "feat: add LeadJourneyViewer component with timeline UI"
```

---

### Task 5: Create VisitorInsightsTab Component

**Files:**
- Create: `app/dashboard/website-analytics/components/VisitorInsightsTab.tsx`

- [ ] **Step 1: Create the main tab component**

Create `app/dashboard/website-analytics/components/VisitorInsightsTab.tsx`:

```typescript
"use client"

import { TabSkeleton } from "./SkeletonLoader"
import { ErrorBanner } from "./ServiceBanner"
import MetricCard from "./MetricCard"
import LineChart from "@/components/charts/LineChart"
import ConversionFunnel from "./ConversionFunnel"
import LeadJourneyViewer from "./LeadJourneyViewer"

type VisitorInsightsData = {
  totalPageViews: number
  uniqueVisitors: number
  avgPagesPerSession: number
  avgDurationPerPage: number | null
  durationSampleSize: number
  dailyPageViews: Array<{ date: string; count: number }>
  funnel: {
    totalVisitors: number
    returningVisitors: number
    convertedVisitors: number
    visitToReturnRate: number
    returnToConvertRate: number
    visitToConvertRate: number
  }
  topPages: Array<{
    path: string
    pageviews: number
    avgDuration: number | null
    avgScrollDepth: number | null
  }>
  topConversionPaths: Array<{ path: string; conversions: number }>
  leadJourneys: Array<{
    leadId: string
    leadName: string
    leadSource: string
    convertedAt: string
    pages: Array<{
      path: string
      duration: number | null
      scrollDepth: number | null
      timestamp: string
    }>
  }>
}

type Props = {
  data: unknown
  loading: boolean
  error: string | null
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function scrollDepthColor(depth: number | null): string {
  if (depth === null) return "text-gray-400"
  if (depth >= 70) return "text-green-600 dark:text-green-400"
  if (depth >= 40) return "text-amber-500 dark:text-amber-400"
  return "text-red-500 dark:text-red-400"
}

export default function VisitorInsightsTab({ data, loading, error }: Props) {
  if (loading) return <TabSkeleton />
  if (error) return <ErrorBanner message={error} />

  const d = data as VisitorInsightsData | null
  if (!d) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No visitor data available yet.</p>
      </div>
    )
  }

  // Empty state for fresh deploy
  if (d.totalPageViews < 5) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total Pageviews" value={d.totalPageViews} />
          <MetricCard label="Unique Visitors" value={d.uniqueVisitors} />
          <MetricCard label="Avg Pages/Session" value={d.avgPagesPerSession} />
          <MetricCard
            label="Avg Duration/Page"
            value={d.avgDurationPerPage !== null ? formatDuration(d.avgDurationPerPage) : "—"}
            subtitle="Insufficient data"
          />
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Visitor tracking just started. Data will appear here as visitors browse the site.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Pageviews" value={d.totalPageViews.toLocaleString()} color="text-blue-600 dark:text-blue-400" />
        <MetricCard label="Unique Visitors" value={d.uniqueVisitors.toLocaleString()} />
        <MetricCard label="Avg Pages/Session" value={d.avgPagesPerSession} />
        <MetricCard
          label="Avg Duration/Page"
          value={d.avgDurationPerPage !== null ? formatDuration(d.avgDurationPerPage) : "—"}
          subtitle={d.avgDurationPerPage !== null ? `Based on ${d.durationSampleSize} pages` : "Insufficient data (<10 samples)"}
        />
      </div>

      {/* Daily Pageview Sparkline */}
      {d.dailyPageViews.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Daily Pageviews (Last 7 Days)</h3>
          <LineChart
            data={d.dailyPageViews.map((dp) => ({ date: dp.date, value: dp.count }))}
            color="#3b82f6"
            height={120}
          />
        </div>
      )}

      {/* Funnel + Content Effectiveness */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <ConversionFunnel data={d.funnel} />

        {/* Content Effectiveness Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content Effectiveness</h3>
          {d.topPages.length === 0 ? (
            <p className="text-sm text-gray-400">No page data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="pb-2 font-medium">Page</th>
                    <th className="pb-2 font-medium text-right">Views</th>
                    <th className="pb-2 font-medium text-right">Avg Time</th>
                    <th className="pb-2 font-medium text-right">Scroll</th>
                  </tr>
                </thead>
                <tbody>
                  {d.topPages.map((page) => (
                    <tr key={page.path} className="border-b border-gray-50 dark:border-gray-700/50">
                      <td className="py-2 text-gray-900 dark:text-white truncate max-w-[200px]" title={page.path}>
                        {page.path}
                      </td>
                      <td className="py-2 text-right text-gray-600 dark:text-gray-300">
                        {page.pageviews}
                      </td>
                      <td className="py-2 text-right text-gray-600 dark:text-gray-300">
                        {page.avgDuration !== null ? formatDuration(page.avgDuration) : "—"}
                      </td>
                      <td className={`py-2 text-right font-medium ${scrollDepthColor(page.avgScrollDepth)}`}>
                        {page.avgScrollDepth !== null ? `${page.avgScrollDepth}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Top Conversion Paths */}
      {d.topConversionPaths.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Last Page Before Conversion</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-2 font-medium">Page</th>
                  <th className="pb-2 font-medium text-right">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {d.topConversionPaths.map((cp) => (
                  <tr key={cp.path} className="border-b border-gray-50 dark:border-gray-700/50">
                    <td className="py-2 text-gray-900 dark:text-white">{cp.path}</td>
                    <td className="py-2 text-right text-green-600 dark:text-green-400 font-medium">{cp.conversions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lead Journey Viewer */}
      <LeadJourneyViewer journeys={d.leadJourneys} />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "VisitorInsightsTab" | head -5`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/website-analytics/components/VisitorInsightsTab.tsx
git commit -m "feat: add VisitorInsightsTab composing all visitor insight sections"
```

---

### Task 6: Wire Up the Tab in page.tsx

**Files:**
- Modify: `app/dashboard/website-analytics/page.tsx`

- [ ] **Step 1: Add import**

In `app/dashboard/website-analytics/page.tsx`, add after the InsightsTab import (line 9):

```typescript
import VisitorInsightsTab from "./components/VisitorInsightsTab"
```

- [ ] **Step 2: Add tab to TABS array**

Change the `TABS` array (lines 12-18) from:

```typescript
const TABS = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "search", label: "Search", icon: "🔍" },
  { id: "performance", label: "Performance", icon: "⚡" },
  { id: "attribution", label: "Attribution", icon: "🎯" },
  { id: "insights", label: "Insights", icon: "🧠" },
] as const
```

To:

```typescript
const TABS = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "search", label: "Search", icon: "🔍" },
  { id: "performance", label: "Performance", icon: "⚡" },
  { id: "attribution", label: "Attribution", icon: "🎯" },
  { id: "insights", label: "Insights", icon: "🧠" },
  { id: "visitors", label: "Visitors", icon: "👁️" },
] as const
```

- [ ] **Step 3: Add endpoint**

In the `endpoints` record inside `fetchTabData` (lines 37-43), add the visitors entry:

Change from:

```typescript
      const endpoints: Record<TabId, string> = {
        overview: `/api/analytics/website/ga4?period=${period}`,
        search: `/api/analytics/website/gsc?period=${period}`,
        performance: `/api/analytics/website/vercel?period=${period}`,
        attribution: `/api/analytics/website/first-party?period=${period}`,
        insights: `/api/analytics/marketing-insights`,
      }
```

To:

```typescript
      const endpoints: Record<TabId, string> = {
        overview: `/api/analytics/website/ga4?period=${period}`,
        search: `/api/analytics/website/gsc?period=${period}`,
        performance: `/api/analytics/website/vercel?period=${period}`,
        attribution: `/api/analytics/website/first-party?period=${period}`,
        insights: `/api/analytics/marketing-insights`,
        visitors: `/api/analytics/website/visitor-insights?period=${period}`,
      }
```

- [ ] **Step 4: Add tab content rendering**

After the insights tab rendering (line 142-143), add before the closing `</div>`:

```typescript
      {activeTab === "visitors" && (
        <VisitorInsightsTab data={current.data} loading={current.loading} error={current.error} />
      )}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "website-analytics" | head -5`

Expected: No errors.

- [ ] **Step 6: Manual verification in browser**

1. Start dev server: `npm run dev`
2. Open `http://localhost:3000/dashboard/website-analytics`
3. Verify the "👁️ Visitors" tab appears as the 6th tab
4. Click it — should show KPI cards (likely with 0/low values) and the empty state message
5. Verify the 14d preset appears in the period selector

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/website-analytics/page.tsx
git commit -m "feat: wire up Visitors tab in website analytics dashboard"
```
