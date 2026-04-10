# Visitor Insights Tab — Design Spec

**Date:** 2026-04-10
**Status:** Approved (post adversarial review)
**Scope:** New tab in website analytics dashboard showing PageView-based visitor insights

## Problem

The identity resolution pixel is now collecting PageView data (consent-gated), but there's no dashboard UI to visualize it. The CFO Agent can answer questions conversationally, but FOUNDER and MARKETING need a visual, at-a-glance view of visitor behavior, conversion funnels, content effectiveness, and individual lead journeys.

## Goals

1. **Conversion funnel visibility** — see how many visitors return and convert
2. **Content effectiveness** — which pages hold attention vs which bounce
3. **Lead journey viewer** — see the full browsing path of individual leads before conversion
4. **Trend awareness** — daily pageview sparkline to spot spikes from campaigns

## Non-Goals

- No real-time/live updating (data refreshes on page load)
- No cohort analysis or date comparison
- No export functionality

## Access Control

- FOUNDER: full access including lead names in journey viewer
- MARKETING: full access but lead names anonymized to `Lead #1`, `Lead #2`, etc.
- TEACHER: no access (analytics permission not granted)

## API

### `GET /api/analytics/website/visitor-insights?period=30`

**Auth:** `checkPermission("analytics", "read")`

**Period options:** 7, 14, 30, 90, 180, 365 (days)

**Response:**

```typescript
interface VisitorInsightsResponse {
  // KPI cards
  totalPageViews: number
  uniqueVisitors: number           // COUNT(DISTINCT visitorId)
  avgPagesPerSession: number       // AVG of page count grouped by sessionId
  avgDurationPerPage: number | null // null if durationSampleSize < 10
  durationSampleSize: number       // number of PageViews with non-null duration

  // Daily trend (last 7 days, regardless of period selector)
  dailyPageViews: Array<{ date: string; count: number }>

  // Conversion funnel
  funnel: {
    totalVisitors: number          // unique visitorIds in period
    returningVisitors: number      // visitorIds seen in ANY PageView before period start
    convertedVisitors: number      // visitorIds that exist on a Lead record
    visitToReturnRate: number      // returning / total * 100 (0-100)
    returnToConvertRate: number    // converted / returning * 100 (0-100)
    visitToConvertRate: number     // converted / total * 100 (0-100)
  }

  // Content effectiveness (top 10, excludes /__conversion/lead)
  topPages: Array<{
    path: string
    pageviews: number
    avgDuration: number | null
    avgScrollDepth: number | null
  }>

  // Last page before conversion (top 5)
  topConversionPaths: Array<{
    path: string
    conversions: number
  }>

  // Lead journeys (last 10 leads with visitorId in period)
  leadJourneys: Array<{
    leadId: string
    leadName: string               // full name for FOUNDER, "Lead #N" for MARKETING
    leadSource: string
    convertedAt: string            // ISO date
    pages: Array<{
      path: string
      duration: number | null
      scrollDepth: number | null
      timestamp: string            // ISO date
    }>
  }>
}
```

### Query Implementation Notes

**Returning visitors:** A visitor is "returning" if their `visitorId` appears in ANY PageView with `timestamp` before the period start date. This captures true behavioral return, not just multiple sessions within the window.

```sql
-- Returning: visitorIds in period that also have pageviews before period start
SELECT COUNT(DISTINCT pv."visitorId")
FROM "PageView" pv
WHERE pv."deletedAt" IS NULL
  AND pv.timestamp >= :periodStart
  AND pv."visitorId" IN (
    SELECT DISTINCT "visitorId" FROM "PageView"
    WHERE timestamp < :periodStart AND "deletedAt" IS NULL
  )
```

**Converted visitors:** visitorIds from the period that match a Lead.visitorId.

**Lead journeys — avoid N+1:** Fetch 10 recent leads with visitorId, collect all visitorIds, then single query:
```sql
SELECT * FROM "PageView"
WHERE "visitorId" IN (:visitorIds)
  AND "deletedAt" IS NULL
  AND "sessionId" != '00000000-0000-0000-0000-000000000000'
ORDER BY timestamp ASC
```
Then group by visitorId client-side in the API route.

**Top conversion paths:** For each converted lead, find the last PageView before their `/__conversion/lead` entry, group by path:
```sql
SELECT sub.path, COUNT(*) as conversions
FROM (
  SELECT DISTINCT ON (pv."visitorId") pv.path, pv."visitorId"
  FROM "PageView" pv
  JOIN "Lead" l ON l."visitorId" = pv."visitorId"
  WHERE pv."deletedAt" IS NULL
    AND pv.path != '/__conversion/lead'
    AND pv."sessionId" != '00000000-0000-0000-0000-000000000000'
  ORDER BY pv."visitorId", pv.timestamp DESC
) sub
GROUP BY sub.path
ORDER BY conversions DESC
LIMIT 5
```

**All queries filter:** `WHERE deletedAt IS NULL` and exclude conversion sentinel rows (`sessionId != '00000000-...'` or `path != '/__conversion/lead'`) unless explicitly showing conversion markers.

## UI Layout

### Tab Integration

6th tab in website analytics page. Icon: `👁️`. Label: "Visitors".

### Layout (top to bottom)

**1. KPI Cards Row**
- `grid-cols-2 lg:grid-cols-4`
- Cards: Total Pageviews, Unique Visitors, Avg Pages/Session, Avg Duration/Page
- Avg Duration shows "Insufficient data" subtitle when `durationSampleSize < 10`

**2. Daily Pageview Sparkline**
- Existing `LineChart` component, 7-day daily pageview trend
- Compact height (~120px), no legend needed (single series)
- Shows regardless of period selector (always last 7 days)

**3. Funnel + Content Table** — `grid-cols-1 lg:grid-cols-2`

Left: **Conversion Funnel** (`ConversionFunnel.tsx`)
- Three horizontal bars stacked vertically:
  - Blue-500: Total Visitors (100% width baseline)
  - Amber-500: Returning Visitors (proportional width)
  - Green-500: Converted (proportional width)
- Percentage labels between bars (e.g., "26% return rate")
- Simple div bars with Tailwind widths — no chart library needed

Right: **Content Effectiveness Table**
- Follows existing `SearchTab.tsx` table pattern (overflow-x-auto, striped rows)
- Columns: Page Path | Views | Avg Duration | Avg Scroll Depth
- Scroll depth color-coded: green-600 >70%, amber-500 40-70%, red-500 <40%
- Duration formatted as "Xm Xs" or "Xs"
- Sorted server-side by composite effectiveness (scroll × duration)
- Excludes `/__conversion/lead` path

**4. Top Conversion Paths**
- Small table: "Last page before conversion" ranked by count
- Columns: Page Path | Conversions
- Max 5 rows

**5. Lead Journey Viewer**
- `<select>` dropdown listing leads: "Name — Source — Date" (anonymized for MARKETING)
- On select, renders vertical timeline:
  - CSS `border-l-2 border-gray-300` with `w-3 h-3 rounded-full` dots
  - Each node: timestamp (relative, e.g., "2 days ago"), page path, duration, scroll depth
  - Final node: green dot + "Converted" label for the conversion event
- Conversion PageView rows (nil UUID sessionId) rendered as the green endpoint, not as a regular page visit

### Empty State

When `totalPageViews < 5`:
- Show a centered message: "Visitor tracking just started. Data will appear here as visitors browse the site."
- Hide funnel, table, and lead journey sections
- Still show the KPI cards (even if showing 0-3)

### Mobile Responsiveness

- KPI cards: `grid-cols-2` (2×2 grid)
- Funnel + Table: `grid-cols-1` (stacked)
- Conversion paths table: full width
- Lead journey: full width, dropdown above timeline

## Files to Create/Modify

| File | Action |
|------|--------|
| `app/api/analytics/website/visitor-insights/route.ts` | Create: API route with all aggregation queries |
| `app/dashboard/website-analytics/components/VisitorInsightsTab.tsx` | Create: main tab component |
| `app/dashboard/website-analytics/components/ConversionFunnel.tsx` | Create: funnel visualization |
| `app/dashboard/website-analytics/components/LeadJourneyViewer.tsx` | Create: timeline component |
| `app/dashboard/website-analytics/page.tsx` | Modify: add 6th tab, fetch visitor-insights data |

## Adversarial Review Log

One round of adversarial review conducted (2026-04-10). Key findings addressed:

1. Lead names anonymized for MARKETING role (privacy)
2. "Returning visitor" redefined: seen before period start, not just 2+ sessions in window
3. Lead journeys must avoid N+1: single PageView query with `visitorId IN [...]`
4. Empty state for fresh deploy (totalPageViews < 5)
5. Duration sample size exposed, metric suppressed below N=10
6. Mobile: `grid-cols-1 lg:grid-cols-2` for funnel+table row
7. Added daily sparkline (7-day trend) using existing LineChart
8. Added "last page before conversion" table (top conversion paths)
9. Conversion sentinel (`/__conversion/lead`) filtered from topPages
