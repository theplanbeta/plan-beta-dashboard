# Identity Resolution Pixel — Design Spec

**Date:** 2026-04-10
**Status:** Approved
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
  referrer    String?
  deviceType  String?   // mobile/tablet/desktop
  country     String?   // from x-vercel-ip-country header
  duration    Int?      // seconds on page (sent via pagehide beacon)
  scrollDepth Int?      // max scroll % reached
  timestamp   DateTime  @default(now())
  deletedAt   DateTime? // GDPR erasure support

  @@index([visitorId])
  @@index([sessionId])
  @@index([timestamp])
  @@index([path])
}
```

### Changed: Lead

```prisma
// Add index only — no new fields
@@index([visitorId])
```

## Collection Flow

### Client Side (TrackingProvider changes)

1. **sessionId generation** — on mount, generate UUID and store in sessionStorage as `pb-session-id`. Dies when tab closes (natural session boundary).

2. **Consent gate** — all beacons gated behind `pb-cookie-consent` analytics acceptance. Same check as Meta Pixel and GA4. No region-specific logic.

3. **Page load beacon** — upgrade existing `sendBeacon` call (TrackingProvider line 162-175) to send:
   - `visitorId` (from localStorage `pb-visitor-id`)
   - `sessionId` (from sessionStorage `pb-session-id`)
   - `path` (current pathname)
   - `referrer` (document.referrer, external only)
   - `deviceType` (mobile/tablet/desktop by viewport width)
   - `timestamp` (ISO string)
   - `type: "pageview"` (to distinguish from pagehide)

4. **Page exit beacon** — add `pagehide` event listener that sends:
   - `visitorId`, `sessionId`, `path` (same as above, for matching)
   - `duration` (seconds since page load)
   - `scrollDepth` (max scroll % reached, from existing scroll tracking)
   - `type: "pagehide"`

5. **Two writes per page** — initial beacon creates PageView row, pagehide beacon updates it with duration/scrollDepth. If pagehide doesn't fire (crash, kill), the pageview is still recorded without enrichment.

### Server Side (`/api/analytics/pageview/route.ts` upgrade)

1. Receive beacon payload
2. Rate limit: `rateLimit(RATE_LIMITS.MODERATE)` from `lib/rate-limit.ts`
3. Validate:
   - `path` is required string, max 500 chars
   - `visitorId` is UUID format
   - `sessionId` is UUID format
   - Body size under 2KB
4. Extract `country` from `x-vercel-ip-country` header
5. If `type === "pageview"`: INSERT new PageView row
6. If `type === "pagehide"`: UPDATE existing PageView matching `visitorId + sessionId + path` with `duration` and `scrollDepth`. Use `ORDER BY timestamp DESC LIMIT 1` to update only the most recent matching row (handles same-page revisits within a session).
7. Return `{ ok: true }`

## Lead Integration

### On form submission (`/api/leads/public`)

No changes to existing flow. The form already sends `visitorId` and the Lead row already stores it.

**One addition:** After creating the lead, insert a PageView with `path: "/__conversion/lead"` so the conversion event appears in the visitor's timeline.

### CFO Agent (`/api/cfo/chat`)

Add three aggregations to the data context injected per message:

1. **Touchpoints before conversion:**
```sql
SELECT l.name, COUNT(pv.id) as pageviews,
       COUNT(DISTINCT pv."sessionId") as sessions
FROM "Lead" l
JOIN "PageView" pv ON pv."visitorId" = l."visitorId"
  AND pv.timestamp < l."createdAt"
  AND pv."deletedAt" IS NULL
WHERE l."visitorId" IS NOT NULL
GROUP BY l.id, l.name
```

2. **Top pages in conversion paths:**
```sql
SELECT pv.path, COUNT(DISTINCT l.id) as leads_who_visited
FROM "PageView" pv
JOIN "Lead" l ON l."visitorId" = pv."visitorId"
WHERE pv."deletedAt" IS NULL
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
  FROM "PageView" WHERE "deletedAt" IS NULL
  GROUP BY "sessionId"
) sessions
```

### Dashboard

No new dashboard page in this version. Data accessible through:
- CFO Agent (conversational queries)
- Existing website analytics page (future: "Visitor Journeys" tab)

## GDPR Compliance & Security

### Consent
- Universal consent gate: `sendBeacon` only fires if `pb-cookie-consent` has `analytics: true`
- If consent not granted, zero pageview data collected — visitor is invisible

### Data Minimization
- No IP addresses stored (only `country` from Vercel header)
- No user agent strings stored (only derived `deviceType`)
- `visitorId` is random UUID — no PII embedded
- No fingerprinting signals collected

### GDPR Erasure (Article 17)
- New utility: `eraseVisitorData(visitorId)` in `lib/privacy.ts`
  - Soft-deletes all PageViews: `SET deletedAt = NOW() WHERE visitorId = ?`
  - Clears visitorId on matching Lead records: `SET visitorId = NULL WHERE visitorId = ?`
  - Returns affected record count for audit logging
- All PageView queries include `WHERE deletedAt IS NULL`
- Monthly cleanup cron: hard-delete rows where `deletedAt` older than 30 days

### Rate Limiting & Validation
- `/api/analytics/pageview` uses `rateLimit(RATE_LIMITS.MODERATE)`
- Reject if `visitorId` is not UUID format
- Reject if `path` longer than 500 chars
- Reject if body larger than 2KB

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
| `app/api/analytics/pageview/route.ts` | Rewrite: persist PageViews, handle pagehide updates |
| `components/marketing/TrackingProvider.tsx` | Add sessionId, consent-gated beacons, pagehide listener |
| `lib/tracking.ts` | Add `getSessionId()` helper |
| `lib/privacy.ts` | New: `eraseVisitorData()` utility |
| `app/api/leads/public/route.ts` | Add conversion PageView on lead creation |
| `app/api/cfo/chat/route.ts` | Add PageView aggregations to CFO context |
