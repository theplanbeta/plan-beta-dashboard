# Plan Beta Day Zero — Hardening Fix Plan

**Date:** 2026-04-11
**Source audit:** `.mempalace/test-reports/consolidated.md` (27 CRIT · 28 HIGH · 32 MED · 18 LOW)
**Branch:** `feat/day-zero-hardening` (new, off current `main` @ `dd393c2`)
**Scope:** All 27 CRITICAL + top 15 HIGH. Defer MEDIUM+LOW to separate backlog PR.

---

## 1. Goals & non-goals

### Goals (this PR must deliver all of these)
- Cold users can successfully sign up and reach the jobs feed
- Logged-in users stay logged in across refreshes
- Grandfathered Pro users see Pro features without the "Upgrade" dead loop
- `dayzero.xyz` serves Day Zero-branded favicons, OG image, robots.txt, sitemap, 404 page
- Job detail pages have server-rendered metadata + canonical + JobPosting JSON-LD
- Rate limiting on all Claude-calling routes
- Anschreiben has a monthly cap
- CV cap is race-safe
- Stripe webhook correctly handles trialing → active, null customer_email, case-sensitive email
- Malformed query params / bodies return 400, not 500
- WCAG AA contrast on BottomNav; iOS form inputs don't zoom; reduced-motion respected; focus visible
- Error / loading / not-found files exist under `/jobs-app/`
- Student-email hijack attack vector closed (email verification)

### Non-goals (explicitly out of scope this PR)
- Re-enabling TypeScript + ESLint in `next.config.ts` (see "Build config deferral" below)
- Replacing native `alert()`/`confirm()` with skeuomorphic modals (15 call sites; UX M-tier)
- Refactoring the 707-LOC `ApplicationKitModal.tsx` god-component
- Phase 6 Mentors feature
- Capacitor wrap
- Stripe product rename for legacy "PlanBeta Jobs Pro"
- Designer-quality favicons (using generated placeholders)
- i18n prep

### Build config deferral — deliberate decision
Q-C3 flagged `next.config.ts` disables tsc+eslint during builds. Re-enabling is CORRECT but risky to bundle into this PR because:
1. The codebase has accumulated type errors (unknown count) that would break Vercel builds immediately
2. Vercel build memory limit (8GB) is why it was disabled in the first place
3. Would force this PR to also fix every pre-existing type error in the whole repo (dashboard, marketing site), massively inflating scope

**Mitigation:** add a `scripts/precommit-check.sh` script that runs `npx tsc --noEmit` and run it manually before pushing. Defer proper CI enforcement to its own PR.

---

## 2. File structure — everything that changes

### New files (22)

```
app/jobs-app/auth/page.tsx                      # NEW sign-up / login page
app/jobs-app/error.tsx                           # NEW error boundary for /jobs-app/*
app/jobs-app/loading.tsx                         # NEW loading UI
app/jobs-app/not-found.tsx                       # NEW Day Zero 404 page
app/not-found.tsx                                # NEW root 404 (for dayzero.xyz)
app/og-day-zero.png/route.ts                     # NEW dynamic OG image via @vercel/og
components/jobs-app/AuthForm.tsx                 # NEW sign-up + login form component
components/jobs-app/SignupSuccessBanner.tsx      # NEW post-signup welcome
lib/rate-limit.ts                                # EXISTS — verify it works, or rewrite
lib/jobs-app-rate-limit.ts                       # NEW per-user rate limiter wrapper
app/api/jobs-app/auth/verify-email/route.ts      # NEW email verification (for S-C1 mitigation)
public/favicon-day-zero.ico                      # NEW (generated placeholder)
public/icon-day-zero-192.png                     # NEW (generated placeholder)
public/icon-day-zero-512.png                     # NEW (generated placeholder)
public/apple-touch-icon-day-zero.png             # NEW (generated placeholder)
app/jobs-app/job/[slug]/page-server.tsx          # NEW server component wrapper
app/jobs-app/job/[slug]/JobDetailClient.tsx      # NEW client-side interactive part
lib/domain-aware-metadata.ts                     # NEW helper for robots/sitemap host detection
```

### Modified files (24)

```
middleware.ts                                    # favicon routing per domain
app/layout.tsx                                   # metadata refinement
app/robots.ts                                    # dual-domain support
app/sitemap.ts                                   # dayzero.xyz URL set (new function)
app/jobs-app/layout.tsx                          # wire error.tsx + loading.tsx + favicon refs
components/jobs-app/AuthProvider.tsx             # DROP document.cookie read, add grandfather field
components/jobs-app/OnboardingForm.tsx           # redirect to /auth if not logged in
components/jobs-app/BottomNav.tsx                # inactive-tab contrast fix
components/jobs-app/ApplicationCard.tsx          # touch targets, focus ring
components/jobs-app/ApplicationKitModal.tsx      # focus ring, touch targets, reduced-motion
components/jobs-app/StageSelector.tsx            # focus ring
app/jobs-app/amtlich.css                         # add .pb-safe, prefers-reduced-motion, 16px inputs
app/jobs-app/page.tsx                            # home page routes unauth users to /auth
app/jobs-app/onboarding/page.tsx                 # redirect to /auth if unauth
app/jobs-app/settings/page.tsx                   # handle ?upgraded=true param, polling
app/jobs-app/jobs/page.tsx                       # iOS 16px font-size fix on selects
app/api/jobs-app/auth/register/route.ts          # email verification scaffold + rate limit
app/api/jobs-app/auth/login/route.ts             # rate limit, brute-force protection
app/api/jobs-app/jobs/route.ts                   # NaN-safe parseInt, 400 on bad input
app/api/jobs-app/jobs/[slug]/route.ts            # rate limit AI deep scoring
app/api/jobs-app/cv/generate/route.ts            # try/catch json parse, transactional count, rate limit
app/api/jobs-app/anschreiben/generate/route.ts   # monthly cap, transactional, rate limit, try/catch
app/api/jobs-app/track/screenshot/route.ts       # rate limit
app/api/jobs-app/subscribe/status/route.ts       # use isPremiumEffective logic
app/api/jobs-app/profile/route.ts                # return grandfathered boolean
app/api/jobs-app/student/link/route.ts           # require email verification before linking
app/api/webhooks/stripe/route.ts                 # null-safe email, lowercase, trialing fix, pro-tier detection
lib/jobs-app-auth.ts                             # add verifyEmailToken helpers
lib/trial-emails.ts                              # rebrand to Day Zero
lib/job-alert-email.ts                           # rebrand to Day Zero
```

---

## 3. Execution lanes (commit structure)

Single branch `feat/day-zero-hardening`, multiple commits for bisectability.

### Lane 1 — Auth unblock (Commit 1)
**Unblocks the product.** Every other fix is moot if nobody can sign up.

#### 1.1 Create sign-up / login UI
**Files:**
- Create: `app/jobs-app/auth/page.tsx`
- Create: `components/jobs-app/AuthForm.tsx`
- Modify: `app/jobs-app/onboarding/page.tsx` (server component gate)
- Modify: `components/jobs-app/OnboardingForm.tsx` (trust authenticated seeker)
- Modify: `app/jobs-app/page.tsx` (CTAs link to `/jobs-app/auth` for unauth users)

#### 1.2 Fix AuthProvider httpOnly bug
**File:** `components/jobs-app/AuthProvider.tsx`

Replace cookie-read check with server-side probe:
```typescript
// OLD (broken):
const token = getCookie("pb-jobs-app")
if (!token) { setSeeker(null); setLoading(false); return }
const profile = await fetchProfile()
...
// NEW:
// Always fetch profile; server reads the httpOnly cookie
// 401 means not logged in, 200 means logged in
const profile = await fetchProfile()  
setSeeker(profile)
setLoading(false)
```

Also drop the `getCookie`/`setCookie`/`deleteCookie` helpers — the server handles the cookie exclusively via `Set-Cookie` headers. The client never touches it.

#### 1.3 Grandfather client check
**Files:**
- `app/api/jobs-app/profile/route.ts` — GET returns `grandfathered: boolean` (call `isPremiumEffective` server-side)
- `components/jobs-app/AuthProvider.tsx` — `isPremium = (tier === PREMIUM && subStatus === active) || !!planBetaStudentId || !!grandfathered`
- Type update to `JobSeeker` interface in AuthProvider

#### 1.4 Post-signup flow
On successful signup, redirect to `/jobs-app/onboarding`. On login, redirect to `/jobs-app/jobs` (they already have a profile).

**Commit message:**
```
feat(jobs-app): unblock cold user signup + fix silent logout

Fixes the two ship-blockers flagged in the audit:

- E-C1: no sign-up UI existed. Adds app/jobs-app/auth/page.tsx with
  email/password register + login forms (AuthForm.tsx). Home page
  CTAs now route unauth users to /jobs-app/auth. Onboarding is now
  strictly post-auth profile setup.

- E-C2 / Q-C1: AuthProvider read the httpOnly pb-jobs-app cookie via
  document.cookie, which always returned null. Users appeared logged
  out on every refresh. Fixed by probing /api/jobs-app/profile
  directly — 200 means logged in, 401 means not.

- E-C3: AuthProvider.isPremium ignored grandfathered users. Added a
  grandfathered: boolean field to /api/jobs-app/profile response
  (computed via isPremiumEffective on the server) and threaded it
  through the client check.

- E-C4: Settings page now polls /api/jobs-app/subscribe/status for up
  to 15 seconds after ?upgraded=true to handle webhook race.
```

---

### Lane 2 — Brand assets (Commit 2)
Everything shared between dayzero.xyz and theplanbeta.com that still says Plan Beta School.

#### 2.1 Not-found pages
- `app/not-found.tsx` — generic Day Zero 404 (serves on all domains)
- `app/jobs-app/not-found.tsx` — jobs-app themed 404 with BottomNav

#### 2.2 Dynamic OG image via @vercel/og
- `app/og-day-zero.png/route.ts` — server-generated image using `ImageResponse` from `next/og` (already bundled with Next.js 15)
- Renders: cream background, "Day Zero" in Fraunces-esque serif, tagline below, brass accent line
- Referenced from `app/jobs-app/layout.tsx` openGraph.images

#### 2.3 Favicon + icon regeneration
Generate simple placeholder PNGs using `@vercel/og` API route OR static files. Start with a text-based "DZ" mark on cream background — designer-quality can come later.

**Fallback plan if I can't produce clean PNGs:** leave the old icons in place for now but fix `og-day-zero.png` (which is the social-share-critical one).

#### 2.4 robots.ts domain-aware
`app/robots.ts` currently returns a single static object. Change to return a union that allows both domains, adjust sitemap path by detecting request host (via `headers()` from `next/headers`):

```typescript
const host = (await headers()).get("host") ?? "theplanbeta.com"
const isDayZero = host.includes("dayzero.xyz")
const base = isDayZero ? "https://dayzero.xyz" : "https://theplanbeta.com"
return {
  rules: [...],
  sitemap: `${base}/sitemap.xml`,
  host: base,
}
```

#### 2.5 sitemap.ts — separate function for dayzero
Don't pollute theplanbeta sitemap with dayzero URLs. Instead, make `app/sitemap.ts` detect host and return one of two URL sets. Day Zero set includes:
- `https://dayzero.xyz/` (home)
- `https://dayzero.xyz/jobs-app/jobs`
- Every job detail URL from `prisma.jobPosting.findMany({ where: { active: true } })` → `https://dayzero.xyz/jobs-app/job/${slug}`

#### 2.6 Job detail SSR metadata + JSON-LD (B-C6)
`app/jobs-app/job/[slug]/page.tsx` is currently 100% client-rendered. Split:
- Rename current file → `app/jobs-app/job/[slug]/JobDetailClient.tsx` (the `"use client"` part)
- Create new `app/jobs-app/job/[slug]/page.tsx` as a server component that:
  - Fetches the job from Prisma
  - Exports `generateMetadata({ params })` → title, description, OG, canonical
  - Returns 404 via `notFound()` if slug doesn't exist (fixes the "nonexistent slugs return 200" bug)
  - Renders `<JobDetailClient job={...} />` for interactivity
  - Injects `<Script type="application/ld+json">` with JobPosting schema.org payload

JobPosting JSON-LD fields needed:
```json
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": "...",
  "description": "...",
  "datePosted": "...",
  "validThrough": "...",
  "employmentType": "FULL_TIME | PART_TIME | CONTRACTOR | INTERN",
  "hiringOrganization": { "@type": "Organization", "name": "..." },
  "jobLocation": { ... },
  "baseSalary": { ... }
}
```

#### 2.7 Email template rebrand
- `lib/trial-emails.ts` and `lib/job-alert-email.ts` — grep for "PlanBeta Jobs" and replace with the current brand
- Subject lines, `<h1>`, body copy, unsubscribe footer all audited

**Commit message:**
```
feat(brand): Day Zero favicons, OG image, robots, sitemap, not-found,
  job JSON-LD

Addresses 6 CRITICAL + 2 HIGH brand findings from the audit.

Shared app-shell assets were still Plan Beta School — invisible to the
rebrand commit which only touched /jobs-app. Fixed:

- B-C1 robots.ts: domain-aware, correct sitemap URL per host
- B-C2 sitemap.ts: separate URL set for dayzero.xyz including every
  active job detail slug from Prisma
- B-C3 not-found.tsx: new root + jobs-app 404 pages (no more "Plan
  Beta School Management" leaking through)
- B-C4 og-day-zero image: dynamic @vercel/og route, 1200x630 Day Zero
  card with tagline
- B-C5 favicons: new DZ icons (placeholder quality; designer pass later)
- B-C6 job detail SSR: split /jobs-app/job/[slug] into server component
  + JobDetailClient. generateMetadata for title/description/canonical,
  JobPosting JSON-LD for Google Jobs indexing, 404 on missing slug
- B-H4 rebrand lib/trial-emails.ts + lib/job-alert-email.ts
```

---

### Lane 3 — Rate limiting & cost containment (Commit 3)

#### 3.1 Verify/upgrade `lib/rate-limit.ts`
Read the existing file first. If it's a real in-memory / Redis-backed limiter, use it. If it's a stub or if it doesn't support per-user keys, write `lib/jobs-app-rate-limit.ts`:

```typescript
// Simple in-memory sliding window (fine for Vercel serverless + 1 region)
// For multi-region, swap to Upstash Redis later
const buckets = new Map<string, number[]>()
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const arr = buckets.get(key) ?? []
  const recent = arr.filter(t => now - t < windowMs)
  if (recent.length >= max) return false
  recent.push(now)
  buckets.set(key, recent)
  return true
}
```

In-memory is fine for a first pass. Upstash Redis can come later.

#### 3.2 Apply to routes
- `/api/jobs-app/auth/login` — 5 attempts/minute per IP + per email
- `/api/jobs-app/auth/register` — 3 attempts/hour per IP
- `/api/jobs-app/cv/generate` — 3 per minute per seeker (rate limit) + 5/month (existing cap)
- `/api/jobs-app/anschreiben/generate` — 3 per minute + **NEW 5/month cap**
- `/api/jobs-app/track/screenshot` — 10 per minute per seeker
- `/api/jobs-app/jobs/[slug]` — 30 per minute per seeker (for AI deep scoring)

#### 3.3 Anschreiben monthly cap
Mirror the CV route exactly:
```typescript
const startOfMonth = new Date()
startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)

// Count generated Anschreibens this month — requires a new Prisma model
// OR we record Anschreibens in GeneratedCV with templateUsed = "anschreiben"
// Simpler: add GeneratedAnschreiben model OR use a type field on GeneratedCV
```

**Decision:** add a `type: "cv" | "anschreiben"` field to `GeneratedCV` (or use the existing `templateUsed` field). Count by seekerId + type + createdAt. **OR** create `GeneratedAnschreiben` model. Leaning toward reusing `GeneratedCV` with `templateUsed` as the discriminator to avoid a schema migration — need to verify the existing schema first.

#### 3.4 Race-safe CV cap (Q-C2)
Wrap the count+create in a Prisma interactive transaction with a fresh count inside the transaction:
```typescript
const cv = await prisma.$transaction(async (tx) => {
  const count = await tx.generatedCV.count({
    where: { seekerId, createdAt: { gte: startOfMonth } }
  })
  if (count >= 5) throw new RateLimitError("Monthly cap reached")
  return tx.generatedCV.create({ data: ... })
})
```

Acceptable race window: transaction-level. Still not perfect (race between two DB transactions), but tighter than current.

**Commit message:**
```
feat(jobs-app): rate limiting + Anschreiben monthly cap + race-safe CV cap

Addresses S-C2 / A-C4 / Q-C2 / A-C3 from the audit.

- New lib/jobs-app-rate-limit.ts with in-memory sliding window
- Applied to login (5/min), register (3/hr), CV gen (3/min), Anschreiben
  gen (3/min), screenshot classifier (10/min), job deep score (30/min)
- Anschreiben now has a 5/month cap identical to CV (was unlimited)
- CV cap is now transactional via prisma.$transaction to reduce
  count→create race window
```

---

### Lane 4 — UX / a11y sweep (Commit 4)

#### 4.1 BottomNav contrast + pb-safe
`app/jobs-app/amtlich.css`:
- Add `.pb-safe { padding-bottom: env(safe-area-inset-bottom, 0.75rem); }`
- BottomNav inactive color: #C9A865 → a higher contrast shade like #E8D69A (AA pass target)

#### 4.2 prefers-reduced-motion
In `amtlich.css`, wrap all keyframe-using selectors:
```css
@media (prefers-reduced-motion: reduce) {
  .amtlich-enter,
  .amtlich-stamp-wet,
  .amtlich-stamp-wet::after {
    animation: none !important;
  }
}
```

#### 4.3 iOS form input zoom
Bump every form control font-size to ≥16px. Affected:
- `.amtlich-select` (filters)
- Auth form inputs (new)
- Settings student email input
- Kit Modal subject/body inputs/textareas

#### 4.4 Focus visible rings
Replace `focus:outline-none` with `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--stamp-red)] focus-visible:ring-offset-2`

Or add a global rule in amtlich.css:
```css
.amtlich :focus-visible {
  outline: 2px solid var(--stamp-red);
  outline-offset: 2px;
}
```

#### 4.5 Touch targets
- ApplicationCard delete: 24×24 → 44×44 (increase hit area with padding)
- Kit Modal close: 32×32 → 44×44
- Secondary buttons: ensure all ≥44×44

#### 4.6 Error / loading files
- `app/jobs-app/error.tsx` — Day Zero-themed error boundary with retry button
- `app/jobs-app/loading.tsx` — brass-colored skeuomorphic loading state

**Commit message:**
```
fix(ux): WCAG AA contrast, touch targets, focus rings, iOS zoom,
  reduced-motion, error/loading files

Addresses U-C1 through U-C7 from the audit.

- BottomNav inactive tab color #C9A865 → #E8D69A (2.33:1 → 4.5:1 AA)
- Added .pb-safe utility for iPhone home indicator safe area
- Global focus-visible ring (stamp red, 2px, offset 2px)
- prefers-reduced-motion mediaq kills stamp thunk + ink bleed
- Form inputs bumped to 16px (was 12-14.72) to prevent iOS zoom
- Touch targets ≥44×44 on delete, close, secondary buttons
- New app/jobs-app/error.tsx + loading.tsx + not-found.tsx (last one
  overlaps with Lane 2's not-found work — consolidated here)
```

---

### Lane 5 — API correctness + code quality (Commit 5)

#### 5.1 NaN-safe parseInt + Zod query validation
`app/api/jobs-app/jobs/route.ts`:
```typescript
const pageRaw = searchParams.get("page")
const page = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1)  // || 1 makes NaN → 1
```
Better: Zod schema on query params.

#### 5.2 Wrap request.json() in try/catch
`cv/generate`, `anschreiben/generate`, and any others flagged.

#### 5.3 Stripe webhook fixes
- `A-C5:` lowercase email consistently — `session.customer_email?.toLowerCase()` before every lookup
- `A-H1:` map `trialing` → `active` (not `inactive`) in `subscription.updated` handler
- `A-H6:` fall back to `session.customer_details?.email` if `session.customer_email` is null
- `A-H5:` tier detection should also match `STRIPE_PRO_PRICE_MONTHLY_EU` and `STRIPE_PRO_PRICE_ANNUAL_EU`

#### 5.4 /subscribe/status uses isPremiumEffective
`app/api/jobs-app/subscribe/status/route.ts`:
Current code uses `seeker.tier === "PREMIUM"` alone. Change to use the async `isPremiumEffective` helper (same source of truth as the API routes).

#### 5.5 Zod enum casts
`app/api/jobs-app/applications/[id]/route.ts` and wherever stage/outcome are parsed: switch `z.string()` → `z.nativeEnum(ApplicationStage)`, `z.nativeEnum(ApplicationOutcome)`.

#### 5.6 Route try/catch (Q-H1)
Wrap the 9+ routes identified by the quality agent. Top-level try/catch that returns a clean 500 with a generic message (never the raw error).

#### 5.7 Type the `any` in jobs-ai.ts (Q-H2)
Replace `any` for profile fields with a concrete `CVProfile` / `AnschreibenProfile` type.

#### 5.8 Protected JSON.parse (Q-H3)
`lib/jobs-ai.ts` — wrap each `JSON.parse(text)` in try/catch, fall back to a sensible default or throw a typed error the route can catch.

#### 5.9 Grandfather S-C1 mitigation — email verification
This is the trickiest CRITICAL. **Can't do a full email verification flow in this PR** without adding Resend integration, magic links, new tokens, expiry logic.

**Interim mitigation:** Require BOTH email match AND either student ID OR WhatsApp match on the student link endpoint. Attacker would need to know the student ID or WhatsApp too — much harder than guessing an email.

**Proper fix (deferred):** add `emailVerified: Boolean @default(false)` to JobSeeker, block student linking unless verified, add a verify-email flow with Resend.

**This PR:** interim mitigation. Leave a TODO for the proper flow.

**Commit message:**
```
fix(api): correctness + code quality fixes from audit

- A-C1 NaN-safe parseInt on /api/jobs-app/jobs page param
- A-C2 try/catch around request.json() in cv + anschreiben gen
- A-C5 webhook lowercase email consistently (prevents grandfather miss)
- A-H1 map trialing → active in subscription.updated (was inactive)
- A-H6 fall back to customer_details.email when customer_email null
- A-H5 webhook Pro tier detection via STRIPE_PRO_PRICE_*_EU vars
- A-H3 /subscribe/status uses isPremiumEffective (matches server gate)
- A-H4 z.nativeEnum for stage/outcome on applications PUT
- Q-H1 top-level try/catch on 9 jobs-app routes
- Q-H2 typed profile params in lib/jobs-ai.ts (no more ": any")
- Q-H3 protected JSON.parse around Claude responses
- Q-H4 stale closure in applications/page.tsx handleDelete
- Q-H5 .catch() on cvs/page fetch + OnboardingForm fetch
- S-C1 (interim) student link requires email + (studentId OR whatsapp)
  match. Full email verification deferred to a follow-up PR.
```

---

### Lane 6 — Type check + smoke test + push (no commit)
- `npx tsc --noEmit` — must pass clean
- Dev server smoke test:
  - `/jobs-app/auth` renders
  - POST register → sets cookie → next page load keeps user logged in
  - `/jobs-app/jobs?page=abc` returns 400 not 500
  - `/jobs-app/jobs` renders
  - `curl -sI dayzero.xyz/og-day-zero.png` returns 200 or a redirect to the @vercel/og route
  - `/not-a-real-route` returns 404 with Day Zero branding
- Push via PAT
- Open PR #3

---

## 4. Rollback plan

If anything breaks in production after merge:
1. `git revert <commit>` for the offending lane commit (they're independent)
2. Push → Vercel auto-redeploys
3. Each lane has its own commit so we can revert one without losing others

Nuclear option: `git revert 40e55ff^..HEAD` reverts the whole branch.

---

## 5. Effort estimate + execution plan

| Lane | Files | Effort | Who |
|---|---|---|---|
| 1 — Auth unblock | 6 | ~90 min | Me, directly |
| 2 — Brand assets | 10 | ~90 min | Me, directly (except SSR split which may need subagent) |
| 3 — Rate limiting | 8 | ~60 min | Me, directly |
| 4 — UX sweep | 8 | ~60 min | Me, directly |
| 5 — API correctness | 12 | ~90 min | Me, directly |
| Total | ~44 modifications | ~6 hours | Hand-crafted to stay coherent |

**Why hand-crafted, not subagents:** the findings are interconnected. Fixing AuthProvider requires understanding the profile endpoint; fixing webhook requires understanding isPremiumEffective; fixing the job detail split requires understanding the current client component's hooks. Subagents would likely duplicate work or miss dependencies.

---

## 6. Risks & mitigations

| # | Risk | Probability | Mitigation |
|---|---|---|---|
| R1 | Auth form UX is bad / insecure | LOW | Match the Die Bewerbungsmappe aesthetic; use existing bcrypt + JWT infra |
| R2 | Brand asset PNGs look amateur | HIGH | Document as placeholder, designer pass later. OG image is the only critical one for social sharing. |
| R3 | @vercel/og for favicon doesn't work (it's for JPEGs/PNGs, not ICO) | MED | Use static PNG favicons instead of ICO |
| R4 | Rate limiter state is lost on cold start | MED | In-memory is fine for first pass; Upstash Redis is a follow-up PR |
| R5 | SSR split of job detail breaks existing interactivity | MED | Test thoroughly; fallback is to leave as client-only with JSON-LD script injected |
| R6 | Prisma transaction on CV cap causes lock contention | LOW | Transaction is short, single-row insert; negligible contention risk |
| R7 | Next.js 15 `headers()` in robots.ts requires specific version | LOW | Verify; Next.js 15 supports this |
| R8 | New `/jobs-app/auth` route conflicts with existing `/api/jobs-app/auth/*` routes | LOW | Different directories, no conflict |
| R9 | Email verification mitigation (studentId OR whatsapp) is too strict and locks out real students | MED | Students know their WhatsApp at minimum — this is what they gave Plan Beta at enrollment |
| R10 | Build fails on Vercel despite passing tsc locally | LOW | Config change deliberately avoided |

---

## 7. Success criteria

After merge, all of these must be true:

1. ✅ Fresh incognito visitor can go from `https://dayzero.xyz` → sign up → logged in → see jobs feed with match scores
2. ✅ Refresh stays logged in
3. ✅ Grandfathered user sees "Pro · Grandfathered" stamp in settings AND the CV generate button works on job detail
4. ✅ `curl "https://dayzero.xyz/api/jobs-app/jobs?page=abc"` returns 400
5. ✅ `curl -sI https://dayzero.xyz/og-day-zero.png` returns 200
6. ✅ `curl https://dayzero.xyz/robots.txt` references `sitemap: https://dayzero.xyz/sitemap.xml`
7. ✅ `curl https://dayzero.xyz/sitemap.xml` contains `/jobs-app/job/*` URLs
8. ✅ `curl https://dayzero.xyz/not-a-real-route` returns 404 with Day Zero branding
9. ✅ Job detail page HTML contains `<script type="application/ld+json">` with JobPosting schema
10. ✅ CV generate rate limit enforces 3/min (429 on 4th request)
11. ✅ Anschreiben 5/month cap enforced
12. ✅ BottomNav inactive text passes Lighthouse contrast audit
13. ✅ `/api/jobs-app/auth/login` returns 429 after 5 bad attempts in 60s
14. ✅ Dev server + Vercel build both clean
15. ✅ `npx tsc --noEmit` passes with zero errors on the branch
