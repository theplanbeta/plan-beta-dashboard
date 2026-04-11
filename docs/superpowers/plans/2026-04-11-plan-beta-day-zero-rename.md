# Plan Beta Day Zero — Rename & Rebrand Migration Plan

**Date:** 2026-04-11
**Status:** Draft — awaiting adversarial review
**Scope:** Rename PlanBeta Jobs PWA → "Plan Beta Day Zero" + adopt `dayzero.xyz` domain + extract 8 mentors from old dayzero codebase for Phase 6.

---

## Goal (one sentence)

Replace all "PlanBeta Jobs / PB" brand tokens in the PWA with "Plan Beta Day Zero / Day Zero / DZ", add `dayzero.xyz` routing to middleware, and preserve the 8 real mentors from `/Users/deepak/DZ/dayzero` as a JSON seed file for future Phase 6 (Mentors feature).

## What is NOT in scope

- ❌ Merging the old dayzero codebase (FastAPI+SQLite stack mismatch with Prisma+Next.js — too expensive)
- ❌ Building the Mentors feature (that's Phase 6, later)
- ❌ Removing `jobs.planbeta.app` as an active domain (kept as alias during transition)
- ❌ DNS changes (user's manual step via GoDaddy + Vercel dashboard)
- ❌ Archiving `/Users/deepak/DZ/dayzero` folder (user's local action, optional)
- ❌ Updating the separate Plan Beta dashboard (`/dashboard`) branding — Day Zero is ONLY the PWA sub-brand

---

## Brand Replacements

### Tokens being retired
| Old | New |
|---|---|
| "PlanBeta Jobs" | "Plan Beta Day Zero" |
| "PB Jobs" | "Day Zero" |
| "PB-2026-XXXX" (DocumentSerial) | "DZ-2026-XXXX" |
| "pb-serial" (sessionStorage key) | "dz-serial" |
| "Your Application Folder" (label) | "Your Day Zero" |
| "Your job search,<br />officially filed." (H1) | "Day Zero with us,<br />Day One at work." |
| "planbeta.app · bewerbungsmappe" (footer) | "planbeta.app · day zero" |
| "Your tactile AI career companion" (old hero subtitle — if present) | "The career companion for professionals on their way to Germany." |

### Tokens staying (parent brand)
- "Plan Beta" — parent brand reference
- "Die Bewerbungsmappe" — German tag in footer (ornamental only, still valid)
- German rubber stamps: "ENTWURF", "OFFIZIELL", "ENTWURF" — all still valid (ornamental)
- German flavor words: Lebenslauf, Anschreiben, Werkstudent — kept

---

## File-by-File Changes

### Files modified (existing)

| # | File | Current content | New content |
|---|---|---|---|
| 1 | `public/jobs-manifest.json` (will rename → `public/day-zero-manifest.json`) | `"name": "PlanBeta Jobs — AI Career Companion"` / `"short_name": "PB Jobs"` | `"name": "Plan Beta Day Zero"` / `"short_name": "Day Zero"` / `"description": "Day Zero with us, Day One at work. The career companion for professionals on their way to Germany."` |
| 2 | `app/jobs-app/layout.tsx` L8 | `title: "PlanBeta Jobs — Your Application Folder"` | `title: "Plan Beta Day Zero — Day Zero with us, Day One at work."` |
| 2 | `app/jobs-app/layout.tsx` L11 | `manifest: "/jobs-manifest.json"` | `manifest: "/day-zero-manifest.json"` |
| 2 | `app/jobs-app/layout.tsx` L15 | `title: "PB Jobs"` (appleWebApp) | `title: "Day Zero"` |
| 3 | `app/jobs-app/page.tsx` L62 | `Your Application Folder` (amtlich label) | `Your Day Zero` |
| 3 | `app/jobs-app/page.tsx` L66 | `Your job search,<br />officially filed.` (H1) | `Day Zero with us,<br />Day One at work.` |
| 3 | `app/jobs-app/page.tsx` L74-75 (subtitle block) | Existing italic paragraph | `The career companion for professionals on their way to Germany.` |
| 3 | `app/jobs-app/page.tsx` L227 | `planbeta.app · bewerbungsmappe` | `dayzero.xyz · by plan beta` |
| 4 | `components/jobs-app/DocumentSerial.tsx` L10 (comment) | `Example: PB-2026-0412 · 11.04.2026 · FILE OPEN` | `Example: DZ-2026-0412 · 11.04.2026 · FILE OPEN` |
| 4 | `components/jobs-app/DocumentSerial.tsx` L25 | `` return `PB-${year}-0000` `` | `` return `DZ-${year}-0000` `` |
| 4 | `components/jobs-app/DocumentSerial.tsx` L26 | `sessionStorage.getItem("pb-serial")` | `sessionStorage.getItem("dz-serial")` |
| 4 | `components/jobs-app/DocumentSerial.tsx` L31 | `` const serial = `PB-${year}-${num}` `` | `` const serial = `DZ-${year}-${num}` `` |
| 4 | `components/jobs-app/DocumentSerial.tsx` L32 | `sessionStorage.setItem("pb-serial", serial)` | `sessionStorage.setItem("dz-serial", serial)` |
| 5 | `middleware.ts` L40-58 (jobs-app routing block) | Only matches `jobs.planbeta.app` and `jobs.localhost` | Also match `dayzero.xyz`, `dayzero.localhost`, `www.dayzero.xyz` — all rewrite to `/jobs-app` |

### Files created (new)

| # | File | Purpose |
|---|---|---|
| 6 | `public/day-zero-manifest.json` | NEW PWA manifest (replacing `jobs-manifest.json`) |
| 7 | `docs/mentors-seed-phase6.json` | Extracted mentor data from `/Users/deepak/DZ/dayzero/apps/web/lib/api/mentors.ts` — 8 real mentors for Phase 6 import |
| 8 | `docs/superpowers/plans/2026-04-11-plan-beta-day-zero-rename.md` | This plan file |

### Files deleted

| # | File | Reason |
|---|---|---|
| 9 | `public/jobs-manifest.json` | Superseded by `day-zero-manifest.json`. Rename not delete — git rename tracking preserved. |

### Files NOT touched (important — confirming we don't accidentally rebrand unrelated things)
- `CLAUDE.md` — stays (project-wide rules)
- `prisma/schema.prisma` — Prisma models keep their existing names (JobSeeker, JobApplication, etc.) because renaming would require a migration; only the USER-FACING brand changes
- `lib/jobs-app-auth.ts` — auth lib keeps its filename; only the brand it represents changes
- `lib/jobs-ai.ts` — AI orchestrator keeps its filename
- `lib/heuristic-scorer.ts` — no changes
- `lib/cv-template.tsx`, `lib/anschreiben-template.tsx` — PDF templates unchanged (they don't show any brand name in output)
- `app/api/jobs-app/**` — all API routes keep their paths (no migration risk)
- `components/jobs-app/ApplicationKitModal.tsx` etc. — UI components unchanged (they don't reference the brand name)
- `components/jobs-app/BottomNav.tsx` — tab labels stay "Home / Jobs / CVs / Tracker / Account" (no "PlanBeta Jobs" wordmark in the nav itself)
- `public/jobs-sw.js` — service worker — does NOT exist as a separate file; PWA uses default. No change.
- `app/layout.tsx` (root) — stays. Root layout is NOT the Day Zero layout.
- All of `app/dashboard/**` — completely unrelated, never touched
- All of `app/site/**` — marketing site, completely unrelated
- All of `app/api/subscriptions/**` — existing dashboard subscriptions, untouched
- `app/api/webhooks/stripe/route.ts` — shared webhook, the jobs-app-source metadata branch logic stays as-is (tier names stay as tier names, not brand names)

---

## Middleware Changes (detail)

Current block (middleware.ts L40-58):
```typescript
// ─── PlanBeta Jobs App routing ──────────────────────────────────────
const isJobsAppDomain = hostname.includes("jobs.planbeta.app") || hostname.includes("jobs.localhost")

if (isJobsAppDomain) {
  if (path.startsWith("/dashboard") || path === "/login") {
    return NextResponse.redirect(new URL("/", request.url))
  }
  const skipPrefixes = ["/api", "/_next", "/jobs-app"]
  const shouldSkip = skipPrefixes.some((p) => path === p || path.startsWith(p + "/"))
  if (!shouldSkip) {
    const rewritePath = path === "/" ? "/jobs-app" : "/jobs-app" + path
    return NextResponse.rewrite(new URL(rewritePath, request.url))
  }
}
```

New block:
```typescript
// ─── Plan Beta Day Zero routing ─────────────────────────────────────
// Accept: dayzero.xyz (production), jobs.planbeta.app (legacy transition),
//         dayzero.localhost / jobs.localhost (dev)
const isDayZeroDomain =
  hostname.includes("dayzero.xyz") ||
  hostname.includes("jobs.planbeta.app") ||
  hostname.includes("dayzero.localhost") ||
  hostname.includes("jobs.localhost")

if (isDayZeroDomain) {
  if (path.startsWith("/dashboard") || path === "/login") {
    return NextResponse.redirect(new URL("/", request.url))
  }
  const skipPrefixes = ["/api", "/_next", "/jobs-app"]
  const shouldSkip = skipPrefixes.some((p) => path === p || path.startsWith(p + "/"))
  if (!shouldSkip) {
    const rewritePath = path === "/" ? "/jobs-app" : "/jobs-app" + path
    return NextResponse.rewrite(new URL(rewritePath, request.url))
  }
}
```

**Rationale for keeping `jobs.planbeta.app`:** No active users yet, but any dev bookmarks, any links shared in test WhatsApp messages, any existing PR comment links all still work. Zero break. We can deprecate after a few weeks.

---

## Mentor Seed JSON (extract from old dayzero)

**Source:** `/Users/deepak/DZ/dayzero/apps/web/lib/api/mentors.ts` lines 57–191 (8 mentor objects)

**Target:** `docs/mentors-seed-phase6.json`

**Format:** Structured JSON array with the essential fields the future `Mentor` Prisma model will need:

```json
[
  {
    "externalId": 1,
    "name": "Deepak Bos",
    "headline": "Doctor doing Specialisation in Germany",
    "avatarUrl": "https://planbeta.in/cdn/shop/files/Deepak_Image.webp?v=...",
    "category": "healthcare",
    "subcategory": "Medical",
    "location": "Germany",
    "languages": ["English", "German", "Hindi", "Malayalam"],
    "rating": 4.9,
    "hourlyRateUsd": 40,
    "note": "Imported from dayzero.xyz prototype, Dec 2025"
  },
  // ... 7 more
]
```

This file is **documentation only** until Phase 6 — no code reads it, no build depends on it. It's a preservation artifact for the real mentor contacts.

---

## Execution Sequence

1. **Audit state** (done in this plan — lines/files confirmed)
2. **Read `/Users/deepak/DZ/dayzero/apps/web/lib/api/mentors.ts` lines 57–191** and extract 8 mentor records to JSON
3. **Create `docs/mentors-seed-phase6.json`** with extracted data
4. **Create `public/day-zero-manifest.json`** (new manifest with Day Zero branding)
5. **Delete `public/jobs-manifest.json`** (superseded)
6. **Edit `app/jobs-app/layout.tsx`** — 3 edits (title, manifest path, appleWebApp title)
7. **Edit `app/jobs-app/page.tsx`** — 4 edits (label, H1, subtitle, footer)
8. **Edit `components/jobs-app/DocumentSerial.tsx`** — 5 edits (comment + 4 PB→DZ replacements, including sessionStorage key)
9. **Edit `middleware.ts`** — replace `isJobsAppDomain` block with `isDayZeroDomain` block
10. **Type check** (`npx tsc --noEmit`)
11. **Dev server smoke test** — curl `http://localhost:3000/jobs-app` and verify H1 changes
12. **Git add + commit** with descriptive message
13. **Git push** via PAT to `feat/planbeta-jobs-pwa`
14. **Document DNS instructions** for user (GoDaddy + Vercel)

---

## Rollback Plan

If anything breaks:

1. `git reset --hard HEAD~1` — undoes the rename commit entirely
2. `git push --force-with-lease` — only if the commit was already pushed (warns if someone else's work would be lost; none in this branch)
3. Middleware reverts to the old `isJobsAppDomain` check
4. Manifest name stays `jobs-manifest.json`

There is NO database change, NO Prisma migration, NO env var change. Rollback is a single commit revert.

**The sessionStorage key change (`pb-serial` → `dz-serial`) is not rollback-sensitive** because it's only in-browser state. Users would just get a fresh serial number; no data loss.

---

## Risks & Mitigations

| # | Risk | Probability | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Middleware rewrite breaks existing `jobs.planbeta.app` traffic | LOW | Medium | Old hostname still in the hostname list; new block is a superset of old behavior |
| R2 | Type errors after edits (e.g., wrong field paths) | LOW | Low | Run `npx tsc --noEmit` before commit; already doing this |
| R3 | Stale manifest cached in browsers → PWA shows old name | MEDIUM | Low | File rename forces new URL (`day-zero-manifest.json`), service worker will detect it on next visit |
| R4 | User types "jobs.planbeta.app" after DNS flip → 404 if we removed it | LOW | Medium | We explicitly KEEP `jobs.planbeta.app` in middleware |
| R5 | The hardcoded footer text "planbeta.app · bewerbungsmappe" appears elsewhere | LOW | Low | Full grep before commit to catch any other references |
| R6 | DocumentSerial session key change creates inconsistency mid-session | VERY LOW | VERY LOW | Key is set per-session; closing/reopening tab assigns a new DZ-prefixed serial. Not user-visible as a problem. |
| R7 | The old `public/jobs-manifest.json` URL is cached in iOS home screen icons from users who already installed | VERY LOW | MEDIUM | No user data exists yet per user confirmation. Not a real risk until after launch. |
| R8 | `dayzero.xyz` DNS/Vercel config fails after merge — user can't access app | LOW | High | `jobs.planbeta.app` kept as fallback. User can test `dayzero.xyz` separately; we don't cut over until it's confirmed working. |
| R9 | The word "Day Zero" trademark conflict with Antler or Day Zero Ventures | LOW | Low | Different industries (VC / employee onboarding vs. career companion for relocation). Plan Beta prefix adds further distinction. Not a legal blocker for launch. |
| R10 | I accidentally rename something in the `prisma/schema.prisma` or API routes that breaks the DB | VERY LOW | VERY HIGH | Explicitly OUT OF SCOPE. Only listed files are touched. I will verify `git diff --stat` before commit shows only the expected files. |
| R11 | Extracting the mentor data from the old codebase inadvertently modifies the old codebase | VERY LOW | Low | Only read operations on `/Users/deepak/DZ/dayzero/`. No writes. |
| R12 | The mentor JSON format doesn't match what Phase 6 will need | LOW | Low | It's documentation only. Phase 6 can reshape the data. The important thing is preserving names + categories + photo URLs. |

---

## Success Criteria

After the commit is pushed:

1. ✅ `git diff main...feat/planbeta-jobs-pwa` shows exactly the files in the plan, nothing else
2. ✅ `npx tsc --noEmit` passes with zero errors
3. ✅ `curl http://localhost:3000/jobs-app` returns HTML containing "Day Zero with us" and "Day One at work"
4. ✅ `grep -rn "PlanBeta Jobs\|PB Jobs" app/jobs-app components/jobs-app public` returns ZERO results (except intentional comments/archival)
5. ✅ `grep -rn "PB-2026" components/jobs-app` returns ZERO results
6. ✅ `docs/mentors-seed-phase6.json` exists with 8 valid JSON objects
7. ✅ Middleware includes `dayzero.xyz` in the hostname check
8. ✅ `public/day-zero-manifest.json` exists and `public/jobs-manifest.json` is deleted
9. ✅ The old `feat/planbeta-jobs-pwa` branch name is kept (branch rename is optional, not required)

## Post-commit user actions (NOT part of the commit)

1. **GoDaddy DNS:** point `dayzero.xyz` to Vercel
   - Option A (apex): A record → Vercel IP (Vercel provides the value after domain is added to project)
   - Option B (CNAME for www): CNAME `www.dayzero.xyz` → `cname.vercel-dns.com`
   - Recommended: both, with apex redirect to www OR apex→A record directly
2. **Vercel dashboard:** add `dayzero.xyz` and `www.dayzero.xyz` as custom domains on the Plan Beta project
3. **Vercel:** verify DNS propagation (usually 5–30 minutes)
4. **Test:** visit `https://dayzero.xyz` in a private window — should land on the Day Zero home page
5. **Optional archive:** `mv /Users/deepak/DZ/dayzero /Users/deepak/DZ/dayzero.archive-2026-04-11`
6. **Optional PWA install test:** from dayzero.xyz, "Add to Home Screen" on iOS/Android to verify the new manifest is picked up
