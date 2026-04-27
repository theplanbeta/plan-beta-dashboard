# Migrant-Aware Job Scraping Expansion — Design

**Date:** 2026-04-27
**Status:** Brainstorm complete, awaiting implementation plan
**Owner:** Plan Beta Dashboard

---

## 1. Problem & Goal

The current job scraper covers a narrow slice of the German labour market. Arbeitsagentur is queried with a single hard-coded keyword (`Krankenpfleger`), Arbeitnow is generic, and the Kimi Claw push pipeline covers eight specific employers (four hospitals, four industrials). Specialised migrant-relevant categories — most notably Assistenzarzt — are effectively absent from the database.

The Plan Beta Jobs portal serves migrants with two distinct profiles: pre-arrival students completing A1–B2 with Plan Beta, and migrants already in Germany looking for their next role. Both groups need filters that reflect migrant realities (language level, Anerkennung status, visa pathway, English-friendliness, salary thresholds for Blue Card), not generic job-board categories.

**Goal:** expand coverage from one keyword to twelve profession categories, and enrich every job posting with ten migrant-relevant signals so a single filter UX serves both personas.

## 2. Non-goals

- Full Arbeitsagentur firehose covering all ~30+ profession keywords. Deferred per user direction ("B, as C involve scraping a lot of jobs and we can go for that later").
- LLM-based job-to-CV match scoring. Separate project.
- The "later" signals: `migrantFriendlyEmployer` (employer track-record score) and `experienceLevel` (entry/mid/senior/Ausbildung).
- Migrating WhatsApp `job_alert_daily` template to surface signals. Phase 2.
- Replacing or modifying the Stripe €1.99/mo subscription itself. New filters reuse the existing tier and `PremiumGate` component.

## 3. User personas

A single signal-tagged dataset serves both:

- **Pre-arrival migrant** (Plan Beta student, India-based, completing A1→B2). Filters by visa pathway (Blue Card / Pflege / Chancenkarte), employer visa sponsorship, relocation support, English-friendliness while German is still in progress.
- **In-Germany migrant** (any nationality, already resident, looking to switch jobs or finish their Anerkennung). Filters by language level required, Anerkennung status (already done / in-progress accepted / required), salary band, location.

Architecture is persona-agnostic. Personas differ only in which filters they typically pre-select.

## 4. Source coverage (12 categories)

### 4.1 Top 5 — deep, via Kimi Claw push

Specialised portals are usually JS-rendered or paywalled, where Kimi Claw already excels.

| Category | Sources |
|---|---|
| Pflege | Pflegejobs.de · Medi-Karriere.de · existing Vivantes / Asklepios / Sana / Schön Klinik |
| Ärzte / Assistenzarzt | Marburger-Bund.de stellenmarkt · Klinik-jobs.de · aerzteblatt.de Stellenmarkt · MedJobsCafe.com |
| IT / Software | StackOverflow Jobs (German filter) · Arbeitnow (existing) · Berlin Startup Jobs · GermanTechJobs.de |
| Ingenieurwesen | StepStone (Ingenieur category) · ingenieur.de stellenmarkt · VDI nachrichten Stellenmarkt |
| Hospitality / Ausbildung | Hotelcareer.de · Gastrojobs.de · Azubi.de |

### 4.2 Other 7 — broad, via Arbeitsagentur keyword rotation + Arbeitnow

| Category | Approach |
|---|---|
| Handwerk (Elektriker, Klempner, Maurer, Schreiner, Maler) | Arbeitsagentur rotation; on shortage list, high volume |
| Logistik / Fahrer / Lager | Arbeitsagentur rotation: `Lagermitarbeiter`, `Berufskraftfahrer`, `Logistik` |
| Verkauf / Vertrieb | Arbeitsagentur rotation: `Verkäufer`, `Vertrieb`, `Außendienst` |
| Sozialarbeit / Erzieher | Arbeitsagentur rotation: `Erzieher`, `Sozialarbeiter`, `Sozialpädagoge` |
| Wissenschaft / Forschung | academics.de feed + Arbeitsagentur rotation |
| Verwaltung / Sachbearbeiter | Arbeitsagentur rotation: `Sachbearbeiter`, `Verwaltung`, `Bürokauffrau` |
| Au Pair / FSJ / BFD | freiwilligendienst.de + Arbeitsagentur rotation |

### 4.3 Arbeitsagentur rotation mechanics

The Arbeitsagentur public API accepts a `was=` query param. Currently called once per cron with `was=Krankenpfleger`. New behaviour: cycle through ~25 keywords across cron runs (chunked, see §7). Each call returns up to 50 jobs. Daily ceiling: ~1,250 candidate jobs (deduped by `externalId`).

The full keyword list lives in `lib/job-source-config.ts` (new file) so it can be edited without code review for keyword tweaks.

## 5. Migrant signals (10 fields per JobPosting)

| # | Field | Type | Tier | Purpose |
|---|---|---|---|---|
| 1 | `languageLevel` | enum `LanguageLevel` (A1, A2, B1, B2, C1, C2, NONE) | Free | German level required |
| 2 | `englishOk` | boolean | Free | Job can be done in English |
| 3 | `anerkennungRequired` | enum `AnerkennungStatus` (REQUIRED, IN_PROGRESS_OK, NOT_REQUIRED) | Free | Recognition needed (regulated professions) |
| 4 | `visaPathway` | enum `VisaPathway` (BLUE_CARD, CHANCENKARTE, PFLEGE_VISA, AUSBILDUNG, FSJ, EU_ONLY, UNCLEAR) | Free | Visa lane this job fits |
| 5 | `salaryBand` | already present (`salaryMin`, `salaryMax`, `currency`) — no new field, just classifier output | Free | Critical for Blue Card thresholds (€45,300 / €48,300) |
| 6 | `anerkennungSupport` | boolean | Premium | Employer actively supports Anerkennung process |
| 7 | `visaSponsorship` | boolean | Premium | Employer explicitly sponsors visa / hires from abroad |
| 8 | `relocationSupport` | string (text snippet, max 200 chars) | Premium | Housing, flight, family support specifics |
| 9 | `migrantFriendlyEmployer` | DEFERRED | Later | Employer track record score (0–3) |
| 10 | `experienceLevel` | DEFERRED | Later | Entry / mid / senior / Ausbildung |

Total new persisted fields: 7 (`languageLevel`, `englishOk`, `anerkennungRequired`, `visaPathway`, `anerkennungSupport`, `visaSponsorship`, `relocationSupport`).

Plus 2 metadata fields:
- `signalsExtractedAt: DateTime?` — null until signals processed; non-null after
- `signalsHash: String?` — SHA-256 of `title + description`, used to skip re-extraction on re-scrape

## 6. Extraction pipeline (hybrid by source)

### 6.1 Kimi Claw path

`/api/jobs/ingest` Zod schema is extended with the seven new signal fields, all nullable. Kimi Claw scrape prompts on the external side are updated to populate them when scraping the new specialised portals. No code change beyond the schema. On ingest, if signals are present in the payload, `signalsExtractedAt` is set to `now()`.

### 6.2 API path (Arbeitsagentur, Arbeitnow)

A new module `lib/job-signals.ts` exports `extractSignals(title, description, requirements): Promise<JobSignals>`. Implementation:

- Compute `signalsHash = sha256(title + description)`.
- Look up existing job by hash; if a previous extraction exists with the same hash, reuse those signals (no Gemini call). This handles re-scrapes and cross-source duplicates.
- Otherwise, call Gemini 2.0 Flash with a strict JSON schema (function calling) returning all seven signal fields plus a confidence value. System prompt explains German labour-market context (Blue Card thresholds, Anerkennung framework, language level conventions like `verhandlungssicher` ≈ C1).
- On success, persist signals + set `signalsExtractedAt = now()`.
- On failure, leave `signalsExtractedAt = null` for retry. After 3 retries (tracked separately, see §9), set `signalsExtractedAt = now()` with all signals null to break the retry loop.

Gemini chosen over Claude because the codebase already wires it for the HTML fallback parser — no new API key, no new SDK.

Cost projection: ~500 new jobs/day × ~€0.0003/job = €0.15/day = €4.50/month. Cache hit rate from `signalsHash` likely brings this lower.

## 7. Cron architecture

Two cron routes, both behind `verifyCronSecret()`, both `maxDuration: 300`.

### 7.1 `/api/cron/job-scraper` — modified

- Schedule: hourly (was 6 AM + 6 PM UTC). Update `vercel.json`.
- Per-run behaviour: pick the next 4 Arbeitsagentur keywords from a rotating cursor stored in the `JobScrapeState` row (see §11 schema). Insert raw jobs without signals.
- Total cycle time across keywords: 25 keywords / 4 per run × 1 hour ≈ 6.25 hours per full rotation. Each keyword refreshed ~3.8 times/day.
- Chunk size is a constant `KEYWORD_CHUNK_SIZE = 4` in `lib/job-source-config.ts`, tunable without redeploy via env var override `KEYWORD_CHUNK_SIZE`.
- Kimi Claw push remains entirely separate; jobs arrive pre-signaled via `/api/jobs/ingest`.

### 7.2 `/api/cron/signal-worker` — new

- Schedule: every 15 minutes.
- Per-run behaviour: query up to 100 `JobPosting` rows where `signalsExtractedAt IS NULL`, ordered by `postedAt DESC`. For each, call `extractSignals()` and update the row. Idempotent across runs because completed rows are skipped.
- Skip logic: if `sourceId` belongs to a Kimi Claw push source, skip extraction (signals arrived in the payload). Use a `JobSource.isPushSource: boolean` flag.

## 8. Backfill

One-time script `scripts/backfill-signals.ts`:

- Iterate all `JobPosting` rows with `signalsExtractedAt IS NULL`.
- Process in batches of 50 with concurrency 5.
- Resumable: each row updated atomically.
- Run manually post-deploy via `npx tsx scripts/backfill-signals.ts`.
- Estimated ~700 rows × €0.0003 = ~€0.21 total cost, ~10 minutes wall time.

## 9. Failure modes & retry policy

- **Gemini API error (network, 5xx, rate limit):** row stays `signalsExtractedAt = NULL`. Retry counter stored in a small `JobSignalAttempt` table (`jobId`, `attempts`, `lastAttemptAt`, `lastError`). After 3 attempts, mark `signalsExtractedAt = now()` with all signal fields null; record stays in DB but is skipped by future runs.
- **Gemini returns malformed JSON:** Zod validation on the function-call response. If invalid, treat as a failure and bump retry counter.
- **Kimi Claw ingest with malformed signal data:** existing per-job try/catch logs the error and accepts the rest of the batch. Signal fields default to null in the create payload.
- **Signal worker timeout:** cron exits cleanly mid-batch (Vercel kills at `maxDuration`). Next run picks up remaining rows. No state loss because completion is row-level.
- **Arbeitsagentur API outage:** scraper logs the failure and moves to the next keyword. Cursor advances regardless to avoid repeatedly retrying a broken keyword.

## 10. Filtering UX (`/jobs/student-jobs`)

### 10.1 New filter group "Migrant fit" (free)

Sidebar additions, multi-select where applicable:

- **Sprachniveau:** A1 / A2 / B1 / B2 / C1 / C2 / Keine Angabe (multi-select)
- **English-friendly:** toggle (single boolean)
- **Anerkennung:** Erforderlich / In Bearbeitung OK / Nicht erforderlich (multi-select)
- **Visa-Weg:** Blue Card / Chancenkarte / Pflege-Visum / Ausbildung / FSJ (multi-select)
- **Gehalt (für Blue Card):** existing salary slider, gains a "Blue Card fit" preset (≥ €48,300)

### 10.2 New filter group "Visa & support" (premium)

Wrapped in `<PremiumGate>`. Free users see the section header with a lock icon and an "Upgrade to filter" CTA opening `SubscriptionModal`.

- **Anerkennung-Unterstützung:** toggle
- **Visa-Sponsoring:** toggle
- **Relocation-Support:** toggle (filters where the field is non-null)

### 10.3 URL params for shareable filtered views

All filters serialise to URL params, e.g. `/jobs/student-jobs?lang=B1,B2&anerkennung=IN_PROGRESS_OK&visa=BLUE_CARD`. Existing portal already uses this pattern; extend with new keys.

### 10.4 Job detail page (`/jobs/student-jobs/job/[slug]`)

- Free signals render as badge row beneath the title (`B2`, `English OK`, `Blue Card`, `Anerkennung in progress OK`).
- Premium signals render as locked rows for free users ("Visa-Sponsoring: 🔒 Upgrade to view"), as filled rows for premium users.
- ISR `revalidate: 3600` unchanged.

## 11. Schema changes (Prisma)

```prisma
enum LanguageLevel {
  A1
  A2
  B1
  B2
  C1
  C2
  NONE
}

enum AnerkennungStatus {
  REQUIRED
  IN_PROGRESS_OK
  NOT_REQUIRED
}

enum VisaPathway {
  BLUE_CARD
  CHANCENKARTE
  PFLEGE_VISA
  AUSBILDUNG
  FSJ
  EU_ONLY
  UNCLEAR
}

model JobPosting {
  // ... existing fields ...
  languageLevel        LanguageLevel?
  englishOk            Boolean?
  anerkennungRequired  AnerkennungStatus?
  visaPathway          VisaPathway?
  anerkennungSupport   Boolean?
  visaSponsorship      Boolean?
  relocationSupport    String?    @db.VarChar(200)

  signalsExtractedAt   DateTime?
  signalsHash          String?    @db.VarChar(64)

  @@index([signalsExtractedAt])
  @@index([languageLevel, anerkennungRequired, visaPathway])
}

model JobSource {
  // ... existing fields ...
  isPushSource Boolean @default(false)
}

model JobSignalAttempt {
  id            String   @id @default(cuid())
  jobId         String   @unique
  job           JobPosting @relation(fields: [jobId], references: [id], onDelete: Cascade)
  attempts      Int      @default(0)
  lastAttemptAt DateTime @default(now())
  lastError     String?  @db.VarChar(500)
}

model JobScrapeState {
  id              String   @id @default("singleton")
  keywordCursor   Int      @default(0)
  updatedAt       DateTime @updatedAt
}
```

Apply via `npx prisma db push` (per project convention — migration history is out of sync, do not use `migrate dev`).

## 12. New / modified files (preview)

New:
- `lib/job-signals.ts` — Gemini-backed extractor + caching by `signalsHash`
- `lib/job-source-config.ts` — Arbeitsagentur keyword list, source registry
- `app/api/cron/signal-worker/route.ts` — async signal worker
- `scripts/backfill-signals.ts` — one-time backfill
- Filter components in `app/jobs/student-jobs/` for the two new filter groups

Modified:
- `prisma/schema.prisma` — fields above
- `lib/job-scraper.ts` — keyword rotation logic, cursor advancement
- `app/api/cron/job-scraper/route.ts` — chunked rotation
- `app/api/jobs/ingest/route.ts` — extended Zod schema, set `signalsExtractedAt` when payload includes signals
- `vercel.json` — hourly scraper cron + 15-min signal-worker cron
- `app/jobs/student-jobs/page.tsx` (and filter sidebar component) — new filter UI
- `app/jobs/student-jobs/job/[slug]/page.tsx` — signal badges + premium-locked rows

## 13. Testing

- **Unit:** `lib/job-signals.ts` — mock Gemini response, verify Zod schema parses, verify cache hit on second call with identical hash.
- **Unit:** `lib/job-source-config.ts` keyword cursor — wraps correctly, advances atomically.
- **Integration:** `/api/jobs/ingest` — accepts payload with signals, sets `signalsExtractedAt`; rejects payload with malformed signal types via Zod.
- **Integration:** `/api/cron/signal-worker` — picks up null-signal jobs, updates them, skips push-source jobs.
- **Manual:** filter UX on `/jobs/student-jobs` — verify free filters work, premium filters show upgrade CTA for free users.

## 14. Rollout

1. Schema push via `prisma db push` (additive only — all new fields nullable).
2. Deploy code with new cron disabled in `vercel.json` initially.
3. Run backfill script manually, confirm signal quality on a sample.
4. Enable signal-worker cron.
5. Switch scraper cron from twice-daily to hourly chunked rotation.
6. Update Kimi Claw prompts on external side to populate signal fields.
7. Ship UI filters.

Each step independently revertable.

## 15. Open questions

None blocking. Implementation plan will refine the Gemini prompt (system message + few-shot examples) and the exact 25-entry Arbeitsagentur keyword list. Storage for the rotation cursor is committed to Postgres (`JobScrapeState` model in §11) — Vercel KV considered and rejected to avoid a new dependency for a single integer.
