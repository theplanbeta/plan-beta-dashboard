# Identity Resolution Pixel — Design Spec

**Date:** 2026-04-10
**Status:** Approved (post adversarial review v2)
**Scope:** Minimal viable identity resolution for theplanbeta.com (single domain)

## Problem

Current tracking has massive gaps:
- 73% of leads arrive with no visitor ID
- Pageview API logs to console only — no persistent storage
- No session reconstruction, no time-on-page, no scroll depth
- No way to see a visitor's full journey before conversion
- CFO Agent cannot answer "how many touchpoints before conversion?"

## Goals

1. **Ad attribution accuracy** — know which pages/campaigns drove conversions
2. **Personalization** (future) — recognize returning visitors
3. **Lead enrichment** — stitch anonymous browsing to known leads for full journey visibility
4. **CFO Agent insights** — touchpoints before conversion, top conversion paths, avg session depth

## Non-Goals (Deferred)

- Cross-device identity resolution (need 500+ leads for reliable matching)
- Probabilistic matching / browser fingerprinting (false positive risk too high at current scale)
- Server-side identity graph (Visitor model, IdentityLink, merge chains)
- Region-adaptive consent (legally broken — VPNs defeat IP geo detection)
- Third-party identity resolution services

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Privacy | Universal consent (same gate as Meta Pixel/GA4) | GDPR applies — 80% traffic is DE, students live in Germany |
| Identifiers | visitorId (localStorage UUID) + sessionId (sessionStorage UUID) | Sufficient for single-domain, scales into full system later |
| Stitching | Implicit string match (PageView.visitorId = Lead.visitorId) | No merge chains, no identity graph overhead |
| Real-time | Synchronous on beacon receipt | Volume is low enough for direct inserts |
| Storage | Single PageView table | Minimal schema surface, GDPR-compliant from day one |

## Data Model

### New: PageView

```prisma
model PageView {
  id          String    @id @default(cuid())
  visitorId   String    // matches localStorage pb-visitor-id
  sessionId   String    // client-generated UUID per tab (sessionStorage)
  path        String
  referrer    String?   // external referrers only (same-domain filtered client-side)
  deviceType  String?   // mobile/tablet/desktop
  country     String?   // from x-vercel-ip-country header
  duration    Int?      // seconds on page (sent via pagehide beacon)
  scrollDepth Int?      // continuous max scroll % (0-100), not milestone-bucketed
  timestamp   DateTime  @default(now())
  deletedAt   DateTime? // GDPR erasure support

  @@index([visitorId])
  @@index([sessionId])
  @@index([timestamp])
  @@index([path])
  @@index([visitorId, sessionId, timestamp]) // composite for pagehide UPDATE lookups
}
```

### Changed: Lead

```prisma
// Add index only — no new fields
@@index([visitorId])
```

## Collection Flow

### Client Side (TrackingProvider changes)

**Important behavioral change:** The current `sendBeacon` call (TrackingProvider lines 159-175) fires WITHOUT any consent check. This is being changed to require consent. After this change, pageview data is only collected for consented users. This is intentional — the existing unconsented beacon was a compliance gap.

1. **sessionId generation** — on mount, generate UUID and store in sessionStorage as `pb-session-id`. Persists across page refreshes within the same tab, clears when tab closes (natural session boundary). Edge case: if sessionStorage is cleared mid-session (browser "clear data on close" setting, Safari ITP), the visitor gets a new sessionId — accepted as an unpreventable edge case.

2. **Consent gate** — all beacons gated behind `pb-cookie-consent` analytics acceptance. Same check as Meta Pixel and GA4 (`getConsent()?.analytics`). No region-specific logic.

3. **Path capture at load time** — store `pathname` in a ref on mount/route change. The pagehide beacon uses the ref value, NOT `window.location.pathname` at unload time (which may have changed in SPA navigation).

4. **Continuous scroll tracking** — add a `maxScrollRef` (useRef) that tracks the maximum continuous scroll percentage (0-100) on every scroll event. This is separate from the existing milestone-based scroll tracking for GA4. The milestone tracking fires events; the maxScrollRef is read once at pagehide.

5. **Page load beacon** — upgrade existing `sendBeacon` call to send (consent-gated):
   - `visitorId` (from localStorage `pb-visitor-id`)
   - `sessionId` (from sessionStorage `pb-session-id`)
   - `path` (current pathname from ref)
   - `referrer` (document.referrer, external only — filter same-domain client-side)
   - `deviceType` (mobile/tablet/desktop by viewport width)
   - `timestamp` (ISO string)
   - `type: "pageview"`

6. **Page exit beacon** — add `pagehide` event listener that sends:
   - `pageViewId` (returned from the server in the initial beacon response — stored in a ref)
   - `duration` (seconds since page load, via `performance.now()`)
   - `scrollDepth` (from `maxScrollRef`)
   - `type: "pagehide"`

7. **Two writes per page** — initial beacon creates PageView row (server returns `pageViewId`), pagehide beacon updates that specific row by ID. If pagehide doesn't fire (crash, kill), the pageview is still recorded without duration/scrollDepth enrichment.

**Note on sendBeacon response:** `sendBeacon` does not return response data. The initial pageview must use `fetch` with `keepalive: true` instead, so we can read the returned `pageViewId`. The pagehide beacon can use `sendBeacon` (fire-and-forget, no response needed).

### Server Side (`/api/analytics/pageview/route.ts` upgrade)

1. Receive beacon payload
2. Bot filtering: check `User-Agent` header server-side (do NOT store it). Reject requests with no User-Agent or known bot User-Agents (Googlebot, bingbot, etc.). Use a lightweight check, not a full bot database.
3. Rate limit: `rateLimit(RATE_LIMITS.MODERATE)` from `lib/rate-limit.ts`
4. Validate:
   - `path` is required string, max 500 chars
   - `visitorId` is UUID format
   - `sessionId` is UUID format (for pageview type)
   - `pageViewId` is cuid format (for pagehide type)
   - `referrer` must not contain same domain (reject internal referrers server-side as defense-in-depth)
   - Body size under 2KB
5. Extract `country` from `x-vercel-ip-country` header
6. If `type === "pageview"`: INSERT new PageView row, return `{ ok: true, pageViewId: row.id }` 
7. If `type === "pagehide"`: UPDATE PageView by `id = pageViewId` with `duration` and `scrollDepth`. This is a simple `prisma.pageView.update({ where: { id } })` — no complex matching needed.
8. Return `{ ok: true }`

## Lead Integration

### On form submission (`/api/leads/public`)

No changes to existing flow. The form already sends `visitorId` and the Lead row already stores it.

**One addition:** After creating the lead successfully, insert a conversion PageView in a **separate try/catch** (fire-and-forget). This follows the same pattern as the existing `createNotification`, `sendTemplate`, and `trackServerLead` calls in this route — a failure in the conversion PageView must NOT cause the lead creation response to return 500.

```typescript
// Fire-and-forget: log conversion event to PageView timeline
try {
  await prisma.pageView.create({
    data: {
      visitorId: data.visitorId || "unknown",
      sessionId: "conversion",
      path: "/__conversion/lead",
      country: request.headers.get("x-vercel-ip-country") || undefined,
      deviceType: data.deviceType || undefined,
    },
  })
} catch {
  // Silent fail — conversion logging is non-critical
}
```

### CFO Agent (`/api/cfo/chat`)

Add three aggregations to the data context injected per message.

**Data quality caveat:** These queries only cover leads created AFTER the PageView system was deployed. Add a note to the CFO system prompt: "PageView tracking data is available from [deploy date]. Touchpoint analysis only covers leads created after this date."

1. **Touchpoints before conversion** (only post-deploy leads with visitorId):
```sql
SELECT l.name, COUNT(pv.id) as pageviews,
       COUNT(DISTINCT pv."sessionId") as sessions
FROM "Lead" l
JOIN "PageView" pv ON pv."visitorId" = l."visitorId"
  AND pv.timestamp < l."createdAt"
  AND pv."deletedAt" IS NULL
WHERE l."visitorId" IS NOT NULL
  AND l."createdAt" >= '2026-04-15'  -- deploy date, update on launch
GROUP BY l.id, l.name
```

2. **Top pages in conversion paths:**
```sql
SELECT pv.path, COUNT(DISTINCT l.id) as leads_who_visited
FROM "PageView" pv
JOIN "Lead" l ON l."visitorId" = pv."visitorId"
WHERE pv."deletedAt" IS NULL
  AND pv.path NOT LIKE '/__conversion/%'
GROUP BY pv.path
ORDER BY leads_who_visited DESC
LIMIT 10
```

3. **Average session depth & duration:**
```sql
SELECT AVG(session_pages) as avg_pages, AVG(session_duration) as avg_duration
FROM (
  SELECT "sessionId", COUNT(*) as session_pages,
         SUM(duration) as session_duration
  FROM "PageView" 
  WHERE "deletedAt" IS NULL
    AND "sessionId" != 'conversion'
  GROUP BY "sessionId"
) sessions
```

### Dashboard

No new dashboard page in this version. Data accessible through:
- CFO Agent (conversational queries)
- Existing website analytics page (future: "Visitor Journeys" tab)

## GDPR Compliance & Security

### Consent
- Universal consent gate: beacons only fire if `pb-cookie-consent` has `analytics: true`
- If consent not granted, zero pageview data collected — visitor is invisible
- **Breaking change:** the existing unconsented sendBeacon (TrackingProvider lines 159-175) is removed and replaced with this consent-gated version

### Data Minimization
- No IP addresses stored (only `country` from Vercel header)
- No user agent strings stored (only derived `deviceType`). User-Agent is checked server-side for bot filtering but never persisted.
- `visitorId` is random UUID — no PII embedded
- No fingerprinting signals collected

### GDPR Erasure (Article 17)
- New utility: `eraseVisitorData(visitorId)` in `lib/privacy.ts`
  - Soft-deletes all PageViews: `SET deletedAt = NOW() WHERE visitorId = ?`
  - Clears visitorId on matching Lead records: `SET visitorId = NULL WHERE visitorId = ?`
  - Returns affected record count for audit logging
- All PageView queries include `WHERE deletedAt IS NULL`
- Monthly cleanup cron: hard-delete rows where `deletedAt` older than 30 days
- **Residual risk (accepted):** Between soft-delete and hard-delete (up to 30 days), the data exists in DB with `deletedAt` set. The conversion PageView `path: "/__conversion/lead"` could theoretically be used to re-identify a lead if an attacker has DB access. This is an accepted risk given the low sensitivity of the data and the 30-day window.

### Rate Limiting & Validation
- `/api/analytics/pageview` uses `rateLimit(RATE_LIMITS.MODERATE)`
- Bot filtering: reject requests with no User-Agent or known bot User-Agents (server-side check, not stored)
- Reject if `visitorId` is not UUID format
- Reject if `path` longer than 500 chars
- Reject if body larger than 2KB
- Reject internal referrers (defense-in-depth)

### Future Identity Hashing
- When IdentityLink is eventually built, use `HMAC-SHA256` with `IDENTITY_HASH_SECRET` env var
- Not plain SHA-256 (reversible for phone numbers via brute force)

## Schema Growth Path

When traffic reaches 500+ leads, extend without rewriting:

1. Add `Visitor` model, FK `PageView.visitorId` → `Visitor.id`
2. Add `IdentityLink` model for email/WhatsApp stitching with HMAC-SHA256
3. Add `Session` model (materialized from PageView groupBy sessionId)
4. PageView data is already there — no backfill needed

## Files to Create/Modify

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add PageView model, add @@index on Lead.visitorId |
| `app/api/analytics/pageview/route.ts` | Rewrite: persist PageViews, handle pagehide updates, bot filtering |
| `components/marketing/TrackingProvider.tsx` | Add sessionId, consent-gated beacons, pagehide listener, continuous scroll tracking, fetch+keepalive for initial pageview |
| `lib/tracking.ts` | Add `getSessionId()` helper |
| `lib/privacy.ts` | New: `eraseVisitorData()` utility |
| `app/api/leads/public/route.ts` | Add fire-and-forget conversion PageView on lead creation |
| `app/api/cfo/chat/route.ts` | Add PageView aggregations to CFO context, add data quality caveat to system prompt |

## Adversarial Review Log

Two rounds of adversarial review conducted (2026-04-10). Key findings addressed:

### Round 1 (full system review)
- Region-adaptive consent bypass is legally indefensible → switched to universal consent
- Probabilistic matching poisons data at current scale → deferred to 500+ leads
- Full system ~100x overbuilt for 71 clicks → scaled back to PageView-only
- Neon connection pool risk → resolved by minimal schema (no Visitor/Session models)
- Unsalted SHA-256 reversible → deferred identity hashing, will use HMAC-SHA256

### Round 2 (minimal spec review)
- Pagehide UPDATE had no reliable Prisma path → changed to return pageViewId from INSERT, UPDATE by ID
- Conversion PageView could kill lead creation → wrapped in fire-and-forget try/catch
- Existing beacon had no consent gate → explicitly flagged as behavioral change
- Scroll depth was milestone-bucketed, not continuous → added maxScrollRef
- CFO queries included historical leads with no data → added deploy date filter
- SPA path mismatch on pagehide → capture path in ref at load time
- Missing composite index → added @@index([visitorId, sessionId, timestamp])
- Bot filtering missing → added server-side UA check (not stored)
