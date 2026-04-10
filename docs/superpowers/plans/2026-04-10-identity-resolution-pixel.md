# Identity Resolution Pixel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a consent-gated pageview collection system that stores visitor journeys, links them to leads, and feeds insights into the CFO Agent.

**Architecture:** A single `PageView` Prisma model captures every consented page visit. The client (TrackingProvider) sends an initial pageview via `fetch` with `keepalive` (to get back the row ID), then sends enrichment (duration, scroll depth) on `pagehide` via `sendBeacon`. The server validates, filters bots, and persists to Neon. Lead submission inserts a conversion marker. CFO Agent queries join PageView to Lead on `visitorId`.

**Tech Stack:** Next.js 15 App Router, Prisma (Neon PostgreSQL), existing `lib/rate-limit.ts`, existing `lib/ua-parser.ts` for bot detection, existing cookie consent system.

**Spec:** `docs/superpowers/specs/2026-04-10-identity-resolution-pixel-design.md`

**No test framework** is installed in this project. Verification steps use manual `curl` commands and `prisma studio` inspection.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `prisma/schema.prisma` | Modify | Add PageView model |
| `lib/tracking.ts` | Modify | Add `getSessionId()` helper |
| `lib/privacy.ts` | Create | `eraseVisitorData()` GDPR utility |
| `app/api/analytics/pageview/route.ts` | Rewrite | Persist PageViews, handle pagehide updates, bot filtering |
| `components/marketing/TrackingProvider.tsx` | Modify | Consent-gated beacons, sessionId, pagehide listener, continuous scroll |
| `app/api/leads/public/route.ts` | Modify | Fire-and-forget conversion PageView |
| `app/api/cfo/chat/route.ts` | Modify | Add PageView aggregations to CFO context |

---

### Task 1: Add PageView Model to Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma` (append after last model)

- [ ] **Step 1: Add the PageView model**

Add at the end of `prisma/schema.prisma` (before any trailing comments):

```prisma
model PageView {
  id          String    @id @default(cuid())
  visitorId   String
  sessionId   String
  path        String
  referrer    String?
  deviceType  String?
  country     String?
  duration    Int?
  scrollDepth Int?
  timestamp   DateTime  @default(now())
  deletedAt   DateTime?

  @@index([visitorId])
  @@index([sessionId])
  @@index([timestamp])
  @@index([path])
  @@index([visitorId, sessionId, timestamp])
}
```

- [ ] **Step 2: Push schema to database**

Run: `npx prisma db push`

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Generate Prisma client**

Run: `npx prisma generate`

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Verify with TypeScript**

Run: `npx tsc --noEmit 2>&1 | head -5`

Expected: No new errors (existing errors may be present).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add PageView model for identity resolution pixel"
```

---

### Task 2: Add `getSessionId()` to `lib/tracking.ts`

**Files:**
- Modify: `lib/tracking.ts:68-82` (after `getVisitorId()`)

- [ ] **Step 1: Add the SESSION_KEY constant**

In `lib/tracking.ts`, add after line 2 (`const VISITOR_KEY = "pb-visitor-id"`):

```typescript
const SESSION_KEY = "pb-session-id"
```

- [ ] **Step 2: Add getSessionId function**

In `lib/tracking.ts`, add after the `getVisitorId()` function (after line 82):

```typescript
// ─── Session ID ─────────────────────────────────────────────────────────
// Per-tab session ID — persists across refreshes, clears on tab close
export function getSessionId(): string {
  if (typeof window === "undefined") return ""
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return ""
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "tracking" | head -5`

Expected: No new errors from tracking.ts.

- [ ] **Step 4: Commit**

```bash
git add lib/tracking.ts
git commit -m "feat: add getSessionId() for per-tab session tracking"
```

---

### Task 3: Create `lib/privacy.ts` — GDPR Erasure Utility

**Files:**
- Create: `lib/privacy.ts`

- [ ] **Step 1: Create the privacy utility**

Create `lib/privacy.ts`:

```typescript
import { prisma } from "@/lib/prisma"

interface EraseResult {
  pageViewsDeleted: number
  leadsUpdated: number
}

/**
 * Soft-delete all PageView records and clear visitorId on Lead records
 * for a given visitor. Used for GDPR Article 17 erasure requests.
 */
export async function eraseVisitorData(visitorId: string): Promise<EraseResult> {
  if (!visitorId) {
    return { pageViewsDeleted: 0, leadsUpdated: 0 }
  }

  const now = new Date()

  const [pageViewResult, leadResult] = await Promise.all([
    prisma.pageView.updateMany({
      where: { visitorId, deletedAt: null },
      data: { deletedAt: now },
    }),
    prisma.lead.updateMany({
      where: { visitorId },
      data: { visitorId: null },
    }),
  ])

  console.log(
    `🔒 GDPR erasure: visitorId=${visitorId} — ${pageViewResult.count} pageviews soft-deleted, ${leadResult.count} leads cleared`
  )

  return {
    pageViewsDeleted: pageViewResult.count,
    leadsUpdated: leadResult.count,
  }
}

/**
 * Hard-delete PageView records that were soft-deleted more than `days` ago.
 * Intended to be called from a monthly cleanup cron.
 */
export async function purgeDeletedPageViews(days: number = 30): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const result = await prisma.pageView.deleteMany({
    where: {
      deletedAt: { not: null, lt: cutoff },
    },
  })

  console.log(`🗑️ Purged ${result.count} soft-deleted PageViews older than ${days} days`)
  return result.count
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "privacy" | head -5`

Expected: No errors from privacy.ts.

- [ ] **Step 3: Commit**

```bash
git add lib/privacy.ts
git commit -m "feat: add GDPR erasure utility for visitor data"
```

---

### Task 4: Rewrite `/api/analytics/pageview/route.ts`

**Files:**
- Rewrite: `app/api/analytics/pageview/route.ts`

- [ ] **Step 1: Replace the pageview route with the full implementation**

Replace the entire contents of `app/api/analytics/pageview/route.ts` with:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"

const limiter = rateLimit(RATE_LIMITS.MODERATE)

// UUID v4 pattern for validation
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Known bot patterns (checked against User-Agent header, not stored)
const BOT_PATTERNS = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|mediapartners|googleother|headlesschrome|phantomjs|prerender/i

function isBot(request: NextRequest): boolean {
  const ua = request.headers.get("user-agent")
  if (!ua) return true // No UA = likely a bot or script
  return BOT_PATTERNS.test(ua)
}

// POST /api/analytics/pageview — Persist pageview data for identity resolution
export async function POST(request: NextRequest) {
  try {
    // Bot filtering (check UA header server-side, never store it)
    if (isBot(request)) {
      return NextResponse.json({ ok: false }, { status: 200 }) // Silent reject
    }

    const rateLimitResult = await limiter(request)
    if (rateLimitResult) return rateLimitResult

    // Body size guard (2KB limit)
    const contentLength = parseInt(request.headers.get("content-length") || "0", 10)
    if (contentLength > 2048) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const body = await request.json()
    const { type } = body

    if (type === "pageview") {
      return handlePageView(request, body)
    } else if (type === "pagehide") {
      return handlePageHide(body)
    }

    return NextResponse.json({ ok: false }, { status: 400 })
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 }) // Silent fail
  }
}

async function handlePageView(
  request: NextRequest,
  body: {
    visitorId?: string
    sessionId?: string
    path?: string
    referrer?: string
    deviceType?: string
    timestamp?: string
  }
) {
  const { visitorId, sessionId, path, referrer, deviceType } = body

  // Validate required fields
  if (!path || typeof path !== "string" || path.length > 500) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  if (!visitorId || !UUID_RE.test(visitorId)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  if (!sessionId || !UUID_RE.test(sessionId)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // Reject internal referrers (defense-in-depth)
  let cleanReferrer = referrer || null
  if (cleanReferrer) {
    try {
      const refHost = new URL(cleanReferrer).hostname
      if (refHost.includes("theplanbeta.com") || refHost.includes("planbeta.app") || refHost.includes("localhost")) {
        cleanReferrer = null
      }
    } catch {
      cleanReferrer = null // Invalid URL
    }
  }

  const country = request.headers.get("x-vercel-ip-country") || null

  const pageView = await prisma.pageView.create({
    data: {
      visitorId,
      sessionId,
      path,
      referrer: cleanReferrer,
      deviceType: deviceType || null,
      country,
    },
  })

  return NextResponse.json({ ok: true, pageViewId: pageView.id })
}

async function handlePageHide(body: {
  pageViewId?: string
  duration?: number
  scrollDepth?: number
}) {
  const { pageViewId, duration, scrollDepth } = body

  // Validate pageViewId (cuid format — alphanumeric, starts with 'c', 25 chars)
  if (!pageViewId || typeof pageViewId !== "string" || pageViewId.length < 20 || pageViewId.length > 30) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // Validate duration (0-3600 seconds = max 1 hour per page)
  const cleanDuration = typeof duration === "number" && duration >= 0 && duration <= 3600
    ? Math.round(duration)
    : null

  // Validate scrollDepth (0-100)
  const cleanScrollDepth = typeof scrollDepth === "number" && scrollDepth >= 0 && scrollDepth <= 100
    ? Math.round(scrollDepth)
    : null

  // Update by ID — simple, no complex matching
  await prisma.pageView.update({
    where: { id: pageViewId },
    data: {
      ...(cleanDuration !== null && { duration: cleanDuration }),
      ...(cleanScrollDepth !== null && { scrollDepth: cleanScrollDepth }),
    },
  }).catch(() => {
    // Silent fail — pageViewId may not exist (race condition, cleared storage)
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "pageview" | head -5`

Expected: No errors from pageview route.

- [ ] **Step 3: Manual test — pageview insert**

Start dev server, then:

```bash
curl -X POST http://localhost:3000/api/analytics/pageview \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 Test" \
  -d '{"type":"pageview","visitorId":"550e8400-e29b-41d4-a716-446655440000","sessionId":"660e8400-e29b-41d4-a716-446655440000","path":"/site","deviceType":"desktop"}'
```

Expected: `{"ok":true,"pageViewId":"c..."}` (a cuid)

- [ ] **Step 4: Manual test — bot rejection**

```bash
curl -X POST http://localhost:3000/api/analytics/pageview \
  -H "Content-Type: application/json" \
  -H "User-Agent: Googlebot/2.1" \
  -d '{"type":"pageview","visitorId":"550e8400-e29b-41d4-a716-446655440000","sessionId":"660e8400-e29b-41d4-a716-446655440000","path":"/site"}'
```

Expected: `{"ok":false}` (status 200, silently rejected)

- [ ] **Step 5: Manual test — pagehide update**

Using the `pageViewId` from step 3:

```bash
curl -X POST http://localhost:3000/api/analytics/pageview \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 Test" \
  -d '{"type":"pagehide","pageViewId":"PASTE_ID_HERE","duration":45,"scrollDepth":87}'
```

Expected: `{"ok":true}`

Verify in Prisma Studio (`npx prisma studio`) that the PageView row has `duration: 45` and `scrollDepth: 87`.

- [ ] **Step 6: Commit**

```bash
git add app/api/analytics/pageview/route.ts
git commit -m "feat: rewrite pageview API to persist identity resolution data"
```

---

### Task 5: Upgrade TrackingProvider — Consent-Gated Beacons + Pagehide

**Files:**
- Modify: `components/marketing/TrackingProvider.tsx`

This is the largest change. We are modifying the existing TrackingProvider to:
1. Add consent-gated initial pageview via `fetch` with `keepalive` (replacing the unconsented sendBeacon)
2. Add pagehide beacon for duration/scrollDepth enrichment
3. Add continuous scroll tracking via `maxScrollRef`
4. Capture path in a ref at load time (SPA-safe)

- [ ] **Step 1: Add imports and refs**

In `components/marketing/TrackingProvider.tsx`, add `getSessionId` to the tracking import on line 5:

```typescript
import { captureTrackingData, trackEvent, getVisitorId, getSessionId } from "@/lib/tracking"
```

Note: `getVisitorId` is already exported from `lib/tracking.ts`. We just added `getSessionId` in Task 2.

- [ ] **Step 2: Replace the unconsented sendBeacon block with consent-gated fetch**

Remove the entire "Internal first-party page view logging" block (lines 159-175 in the current TrackingProvider):

```typescript
  // Internal first-party page view logging (consent-free, no PII)
  useEffect(() => {
    if (!pathname) return
    try {
      const data = JSON.stringify({
        path: pathname,
        referrer: document.referrer || undefined,
        deviceType: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
        timestamp: new Date().toISOString(),
      })
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/analytics/pageview", data)
      }
    } catch {
      // Silent fail — pageview logging is non-critical
    }
  }, [pathname])
```

Replace it with this consent-gated pageview + pagehide system:

```typescript
  // ─── Identity Resolution Pixel ────────────────────────────────────────────
  // Consent-gated pageview tracking with duration and scroll depth enrichment
  const pageViewIdRef = useRef<string | null>(null)
  const pageLoadTimeRef = useRef<number>(0)
  const currentPathRef = useRef<string>("")
  const maxScrollRef = useRef<number>(0)

  // Track continuous max scroll position (separate from milestone-based GA4 tracking)
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight <= 0) return
      const percent = Math.round((scrollTop / docHeight) * 100)
      if (percent > maxScrollRef.current) {
        maxScrollRef.current = percent
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Send consent-gated pageview on route change
  useEffect(() => {
    if (!consented || !pathname) return

    // Capture path at load time (SPA-safe — don't read window.location at pagehide)
    currentPathRef.current = pathname
    pageLoadTimeRef.current = performance.now()
    maxScrollRef.current = 0
    pageViewIdRef.current = null

    const visitorId = getVisitorId()
    const sessionId = getSessionId()
    if (!visitorId || !sessionId) return

    // Use fetch with keepalive to get back pageViewId (sendBeacon can't read responses)
    fetch("/api/analytics/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "pageview",
        visitorId,
        sessionId,
        path: pathname,
        referrer: document.referrer && !document.referrer.includes(window.location.hostname)
          ? document.referrer
          : undefined,
        deviceType: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
        timestamp: new Date().toISOString(),
      }),
      keepalive: true,
    })
      .then(res => res.json())
      .then(data => {
        if (data.pageViewId) {
          pageViewIdRef.current = data.pageViewId
        }
      })
      .catch(() => {}) // Silent fail
  }, [pathname, consented])

  // Send pagehide beacon with duration and scroll depth
  useEffect(() => {
    const handlePageHide = () => {
      const pvId = pageViewIdRef.current
      if (!pvId) return

      const duration = Math.round((performance.now() - pageLoadTimeRef.current) / 1000)

      navigator.sendBeacon(
        "/api/analytics/pageview",
        JSON.stringify({
          type: "pagehide",
          pageViewId: pvId,
          duration,
          scrollDepth: maxScrollRef.current,
        })
      )
    }

    window.addEventListener("pagehide", handlePageHide)
    return () => window.removeEventListener("pagehide", handlePageHide)
  }, [])
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "TrackingProvider" | head -5`

Expected: No new errors.

- [ ] **Step 4: Manual verification in browser**

1. Start dev server: `npm run dev`
2. Open `http://localhost:3000/site` in Chrome
3. Accept cookie consent
4. Open DevTools → Network tab
5. Navigate to another page (e.g., `/site/courses`)
6. Verify: a `fetch` request to `/api/analytics/pageview` with `type: "pageview"` in the payload, response contains `pageViewId`
7. Close the tab or navigate away
8. Check Prisma Studio — PageView row should exist with `duration` and `scrollDepth` populated

- [ ] **Step 5: Commit**

```bash
git add components/marketing/TrackingProvider.tsx
git commit -m "feat: consent-gated identity pixel with pagehide enrichment"
```

---

### Task 6: Add Conversion PageView to Lead Submission

**Files:**
- Modify: `app/api/leads/public/route.ts:155-157` (after `trackServerLead` call, before the return)

- [ ] **Step 1: Add fire-and-forget conversion PageView**

In `app/api/leads/public/route.ts`, add after the `trackServerLead` block (after line 155, before the `return` on line 157):

```typescript
    // Fire-and-forget: log conversion event to visitor's PageView timeline
    try {
      if (data.visitorId) {
        await prisma.pageView.create({
          data: {
            visitorId: data.visitorId,
            sessionId: "conversion",
            path: "/__conversion/lead",
            country: request.headers.get("x-vercel-ip-country") || undefined,
            deviceType: data.deviceType || undefined,
          },
        })
      }
    } catch {
      // Silent fail — conversion logging is non-critical
    }
```

- [ ] **Step 2: Add prisma import check**

Verify that `prisma` is already imported at the top of the file. It should be — line 2 has `import { prisma } from "@/lib/prisma"`.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "leads/public" | head -5`

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/leads/public/route.ts
git commit -m "feat: log conversion PageView on lead submission"
```

---

### Task 7: Add PageView Insights to CFO Agent

**Files:**
- Modify: `app/api/cfo/chat/route.ts:67-278` (the `getCfoContext()` function)

- [ ] **Step 1: Add PageView aggregation queries to getCfoContext**

In `app/api/cfo/chat/route.ts`, inside the `getCfoContext()` function, add to the `Promise.all` array (after the `jobSubscriptions` query around line 157, before the closing `])`):

```typescript
    // PageView analytics (identity resolution data)
    prisma.pageView.count({ where: { deletedAt: null } }),
    prisma.pageView.groupBy({
      by: ["path"],
      where: { deletedAt: null },
      _count: true,
      orderBy: { _count: { path: "desc" } },
      take: 10,
    }),
```

- [ ] **Step 2: Destructure the new values**

Update the destructuring after the `Promise.all` (around line 73). Add after `jobSubscriptions`:

```typescript
    totalPageViews,
    topPages,
```

So the full destructuring line becomes:

```typescript
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
```

- [ ] **Step 3: Add PageView context to the returned string**

In `getCfoContext()`, before the closing backtick of the return template literal (around line 278), add:

```typescript

WEBSITE VISITOR TRACKING (since pixel deployment):
- Total tracked pageviews: ${totalPageViews}
- Top pages: ${topPages.slice(0, 5).map((p: { path: string; _count: number }) => `${p.path} (${p._count} views)`).join(", ") || "No data yet"}
- Note: PageView tracking data available from April 2026. Touchpoint analysis only covers leads created after this date.`
```

- [ ] **Step 4: Add the data quality caveat to the CFO system prompt**

In the `CFO_SYSTEM_PROMPT` string (around line 12), add before the closing backtick:

```

DATA QUALITY NOTES:
- PageView visitor tracking deployed April 2026. Touchpoint-before-conversion analysis only covers leads created after deployment.
- Only visitors who accepted cookie consent are tracked. Actual traffic is higher than tracked pageviews.`
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "cfo" | head -5`

Expected: No new errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/cfo/chat/route.ts
git commit -m "feat: add PageView insights to CFO Agent context"
```

---

### Task 8: Verify End-to-End Flow

This task verifies the complete flow works together.

- [ ] **Step 1: Start dev server and open browser**

Run: `npm run dev`

Open `http://localhost:3000/site` in Chrome.

- [ ] **Step 2: Accept cookie consent and browse**

1. Accept analytics cookies in the consent banner
2. Visit 3-4 pages: `/site`, `/site/courses`, `/site/contact`, `/site/about`
3. On each page, scroll down at least 50%

- [ ] **Step 3: Verify PageView records in Prisma Studio**

Run: `npx prisma studio`

Open the PageView table. You should see:
- 4 rows (one per page visited)
- All with the same `visitorId` and `sessionId`
- `country` populated (from Vercel header, may be null on localhost)
- `duration` and `scrollDepth` populated on rows where you navigated away (may be null on the last page if you didn't close the tab)

- [ ] **Step 4: Submit a test lead**

Fill out the contact form at `/site/contact` with test data. After submission, check Prisma Studio:
- A new Lead row should have your `visitorId`
- A PageView with `path: "/__conversion/lead"` and `sessionId: "conversion"` should exist

- [ ] **Step 5: Verify CFO Agent sees the data**

Go to `/dashboard/cfo` (login as FOUNDER), ask: "How many pageviews have been tracked so far?"

The CFO should reference the PageView data in its response.

- [ ] **Step 6: Test GDPR erasure**

Open a Node console:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const before = await p.pageView.count({ where: { deletedAt: null } });
  console.log('PageViews before:', before);
  // Replace with an actual visitorId from your test
  // const { eraseVisitorData } = require('./lib/privacy');
  // await eraseVisitorData('YOUR_VISITOR_ID');
  // const after = await p.pageView.count({ where: { deletedAt: null } });
  // console.log('PageViews after:', after);
  await p.\$disconnect();
})();
"
```

- [ ] **Step 7: Final commit with all files**

Verify all changes are committed:

```bash
git status
```

If any uncommitted changes remain, stage and commit them.

**Note:** The spec mentions a monthly cleanup cron to hard-delete soft-deleted PageViews. The `purgeDeletedPageViews()` function is created in Task 3 but no cron route is added in this plan. Add it to an existing monthly cron or create a new one when needed — not urgent until you have significant data volume.

- [ ] **Step 8: Push to remote**

```bash
git push origin main
```

This triggers a Vercel production deploy. After deploy, verify the pixel works on `theplanbeta.com` by:
1. Opening the site in incognito
2. Accepting cookies
3. Browsing a few pages
4. Checking the PageView table in Prisma Studio (or via the CFO Agent)
