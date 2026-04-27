# Migrant-Aware Job Scraping Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand job scraper from a single `Krankenpfleger` keyword to 12 profession categories with 10 migrant-relevant signals tagged on every JobPosting, served through new free + premium filter UX.

**Architecture:** Hybrid signal extraction — Kimi Claw (push-only) populates signals for specialised portals; Gemini 2.0 Flash extracts signals for jobs from JSON APIs (Arbeitsagentur, Arbeitnow). Hourly chunked Arbeitsagentur keyword rotation (~4 keywords/run × 25 keywords ≈ 6h cycle) replaces twice-daily fixed scrape. Async signal worker (every 15 min) keeps extraction off the scrape critical path.

**Tech Stack:** Next.js 15 App Router · Prisma 6 (Neon Postgres) · Zod · `@google/generative-ai` (gemini-2.5-flash-lite) · Vitest · Tailwind 4 · existing `PremiumGate` + `SubscriptionModal` components

**Spec:** `docs/superpowers/specs/2026-04-27-migrant-aware-job-scraping-design.md` (commit `4ab48b8`)

---

## File Inventory

**New files:**
- `lib/job-source-config.ts` — Arbeitsagentur keyword list + `KEYWORD_CHUNK_SIZE` + helper to compute next chunk from cursor
- `lib/job-signals.ts` — Gemini-backed signal extractor + cache by `signalsHash`
- `lib/__tests__/job-source-config.test.ts` — keyword rotation cursor tests
- `lib/__tests__/job-signals.test.ts` — schema + cache + retry tests
- `app/api/cron/signal-worker/route.ts` — async signal worker cron
- `scripts/backfill-signals.ts` — one-time backfill script
- `components/jobs-portal/MigrantFitFilters.tsx` — free filter group
- `components/jobs-portal/VisaSupportFilters.tsx` — premium filter group
- `components/jobs-portal/SignalBadges.tsx` — signal badges for job detail page

**Modified files:**
- `prisma/schema.prisma` — 3 enums, 9 new fields on `JobPosting`, `JobSource.isPushSource`, `JobSignalAttempt`, `JobScrapeState`
- `lib/job-scraper.ts` — accept multi-keyword rotation, cursor wiring
- `app/api/cron/job-scraper/route.ts` — chunked rotation orchestration
- `app/api/jobs/ingest/route.ts` — extend Zod schema with signal fields, set `signalsExtractedAt`
- `app/jobs/student-jobs/page.tsx` (and/or filter sidebar component) — mount the two new filter groups
- `app/jobs/student-jobs/job/[slug]/page.tsx` — render signal badges
- `vercel.json` — hourly scraper cron + new 15-min signal-worker cron

---

## Task 1: Prisma schema — enums, signal fields, supporting models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1.1: Add the three new enums after the existing enums block**

Open `prisma/schema.prisma`. Find the last `enum` declaration. After it, add:

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
```

- [ ] **Step 1.2: Add 9 new fields + 2 indexes to the `JobPosting` model**

Inside the `model JobPosting { ... }` block, add (alongside existing fields, before the closing brace):

```prisma
  languageLevel        LanguageLevel?
  englishOk            Boolean?
  anerkennungRequired  AnerkennungStatus?
  visaPathway          VisaPathway?
  anerkennungSupport   Boolean?
  visaSponsorship      Boolean?
  relocationSupport    String?    @db.VarChar(200)

  signalsExtractedAt   DateTime?
  signalsHash          String?    @db.VarChar(64)

  signalAttempt        JobSignalAttempt?

  @@index([signalsExtractedAt])
  @@index([languageLevel, anerkennungRequired, visaPathway])
```

- [ ] **Step 1.3: Add `isPushSource` field to `JobSource`**

Inside `model JobSource { ... }` add:

```prisma
  isPushSource Boolean @default(false)
```

- [ ] **Step 1.4: Add `JobSignalAttempt` and `JobScrapeState` models**

Below `JobPosting`/`JobSource`, add two new models:

```prisma
model JobSignalAttempt {
  id            String     @id @default(cuid())
  jobId         String     @unique
  job           JobPosting @relation(fields: [jobId], references: [id], onDelete: Cascade)
  attempts      Int        @default(0)
  lastAttemptAt DateTime   @default(now())
  lastError     String?    @db.VarChar(500)
}

model JobScrapeState {
  id              String   @id @default("singleton")
  keywordCursor   Int      @default(0)
  updatedAt       DateTime @updatedAt
}
```

- [ ] **Step 1.5: Push schema to Neon and regenerate the Prisma client**

Run:
```bash
npx prisma db push && npx prisma generate
```
Expected: `🚀 Your database is now in sync with your Prisma schema.` followed by `✔ Generated Prisma Client`. No data loss prompt because all new columns are nullable / additive.

- [ ] **Step 1.6: Verify enums exist in DB**

Run:
```bash
npx prisma studio
```
Open `JobPosting`. Confirm new columns appear (languageLevel, englishOk, anerkennungRequired, visaPathway, anerkennungSupport, visaSponsorship, relocationSupport, signalsExtractedAt, signalsHash). Close studio.

- [ ] **Step 1.7: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(jobs): schema for migrant signals + keyword-rotation state"
```

---

## Task 2: Source config — keyword list + cursor helper

**Files:**
- Create: `lib/job-source-config.ts`
- Create: `lib/__tests__/job-source-config.test.ts`

- [ ] **Step 2.1: Write the failing test**

Create `lib/__tests__/job-source-config.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import {
  ARBEITSAGENTUR_KEYWORDS,
  KEYWORD_CHUNK_SIZE,
  nextChunk,
} from "@/lib/job-source-config"

describe("ARBEITSAGENTUR_KEYWORDS", () => {
  it("contains at least 25 keywords spanning the planned profession set", () => {
    expect(ARBEITSAGENTUR_KEYWORDS.length).toBeGreaterThanOrEqual(25)
    expect(ARBEITSAGENTUR_KEYWORDS).toContain("Krankenpfleger")
    expect(ARBEITSAGENTUR_KEYWORDS).toContain("Assistenzarzt")
    expect(ARBEITSAGENTUR_KEYWORDS).toContain("Elektriker")
  })
})

describe("nextChunk", () => {
  it("returns the first KEYWORD_CHUNK_SIZE keywords when cursor is 0", () => {
    const { keywords, nextCursor } = nextChunk(0)
    expect(keywords).toHaveLength(KEYWORD_CHUNK_SIZE)
    expect(keywords[0]).toBe(ARBEITSAGENTUR_KEYWORDS[0])
    expect(nextCursor).toBe(KEYWORD_CHUNK_SIZE)
  })

  it("wraps around when cursor exceeds the list length", () => {
    const { keywords, nextCursor } = nextChunk(ARBEITSAGENTUR_KEYWORDS.length)
    expect(keywords).toHaveLength(KEYWORD_CHUNK_SIZE)
    expect(keywords[0]).toBe(ARBEITSAGENTUR_KEYWORDS[0])
    expect(nextCursor).toBe(KEYWORD_CHUNK_SIZE)
  })

  it("handles a chunk that crosses the wrap boundary", () => {
    const start = ARBEITSAGENTUR_KEYWORDS.length - 2
    const { keywords, nextCursor } = nextChunk(start)
    expect(keywords).toHaveLength(KEYWORD_CHUNK_SIZE)
    expect(keywords[0]).toBe(ARBEITSAGENTUR_KEYWORDS[start])
    expect(keywords[1]).toBe(ARBEITSAGENTUR_KEYWORDS[start + 1])
    // remaining KEYWORD_CHUNK_SIZE-2 keywords come from the start of the list
    expect(keywords[2]).toBe(ARBEITSAGENTUR_KEYWORDS[0])
    expect(nextCursor).toBe(KEYWORD_CHUNK_SIZE - 2)
  })
})
```

- [ ] **Step 2.2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/job-source-config.test.ts`
Expected: FAIL with module not found (`Cannot find module '@/lib/job-source-config'`).

- [ ] **Step 2.3: Implement `lib/job-source-config.ts`**

Create `lib/job-source-config.ts`:

```typescript
/**
 * Source registry for the migrant-aware scraper.
 *
 * Owns:
 * - The Arbeitsagentur keyword rotation list spanning the 12 profession
 *   categories from the design spec.
 * - Chunk-size config and the cursor advancement helper used by
 *   /api/cron/job-scraper to iterate through keywords across cron runs.
 */

const RAW_CHUNK = Number(process.env.KEYWORD_CHUNK_SIZE)
export const KEYWORD_CHUNK_SIZE = Number.isFinite(RAW_CHUNK) && RAW_CHUNK > 0 ? RAW_CHUNK : 4

export const ARBEITSAGENTUR_KEYWORDS: readonly string[] = [
  // Pflege
  "Krankenpfleger",
  "Altenpfleger",
  "Pflegefachkraft",
  // Ärzte
  "Assistenzarzt",
  "Arzt",
  "Facharzt",
  // IT / Software
  "Softwareentwickler",
  "DevOps",
  // Ingenieurwesen
  "Maschinenbauingenieur",
  "Elektroingenieur",
  "Bauingenieur",
  // Hospitality / Ausbildung
  "Hotelfachmann",
  "Koch",
  "Ausbildung",
  // Handwerk
  "Elektriker",
  "Klempner",
  "Maurer",
  // Logistik
  "Lagermitarbeiter",
  "Berufskraftfahrer",
  // Verkauf / Vertrieb
  "Verkäufer",
  "Vertrieb",
  // Sozialarbeit
  "Erzieher",
  "Sozialarbeiter",
  // Verwaltung
  "Sachbearbeiter",
  // Wissenschaft
  "Wissenschaftlicher Mitarbeiter",
] as const

export interface KeywordChunk {
  keywords: string[]
  nextCursor: number
}

/**
 * Given the current cursor (0-based index into ARBEITSAGENTUR_KEYWORDS),
 * return the next KEYWORD_CHUNK_SIZE keywords (wrapping around the end of the
 * list) and the new cursor position to persist.
 */
export function nextChunk(cursor: number): KeywordChunk {
  const len = ARBEITSAGENTUR_KEYWORDS.length
  const start = ((cursor % len) + len) % len // normalise negative / overflow
  const keywords: string[] = []
  for (let i = 0; i < KEYWORD_CHUNK_SIZE; i++) {
    keywords.push(ARBEITSAGENTUR_KEYWORDS[(start + i) % len])
  }
  const nextCursor = (start + KEYWORD_CHUNK_SIZE) % len
  return { keywords, nextCursor }
}
```

- [ ] **Step 2.4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/job-source-config.test.ts`
Expected: PASS, 4 tests green.

- [ ] **Step 2.5: Commit**

```bash
git add lib/job-source-config.ts lib/__tests__/job-source-config.test.ts
git commit -m "feat(jobs): keyword rotation config + cursor helper"
```

---

## Task 3: Signal extractor library — Gemini call + caching

**Files:**
- Create: `lib/job-signals.ts`
- Create: `lib/__tests__/job-signals.test.ts`

- [ ] **Step 3.1: Write the failing test**

Create `lib/__tests__/job-signals.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { JobSignalsSchema, computeSignalsHash } from "@/lib/job-signals"

describe("JobSignalsSchema", () => {
  it("parses a fully populated signal payload", () => {
    const raw = {
      languageLevel: "B2",
      englishOk: false,
      anerkennungRequired: "REQUIRED",
      visaPathway: "BLUE_CARD",
      anerkennungSupport: true,
      visaSponsorship: true,
      relocationSupport: "Umzugskostenpauschale + 4 Wochen Übergangswohnung",
    }
    const parsed = JobSignalsSchema.parse(raw)
    expect(parsed.languageLevel).toBe("B2")
    expect(parsed.relocationSupport).toContain("Übergangswohnung")
  })

  it("accepts nulls for every field (model uncertain)", () => {
    const raw = {
      languageLevel: null,
      englishOk: null,
      anerkennungRequired: null,
      visaPathway: null,
      anerkennungSupport: null,
      visaSponsorship: null,
      relocationSupport: null,
    }
    const parsed = JobSignalsSchema.parse(raw)
    expect(parsed.languageLevel).toBeNull()
  })

  it("rejects an unknown enum value", () => {
    const raw = {
      languageLevel: "PERFECT",
      englishOk: false,
      anerkennungRequired: "REQUIRED",
      visaPathway: "BLUE_CARD",
      anerkennungSupport: false,
      visaSponsorship: false,
      relocationSupport: null,
    }
    expect(() => JobSignalsSchema.parse(raw)).toThrow()
  })

  it("clamps relocationSupport to 200 chars", () => {
    const long = "a".repeat(500)
    const raw = {
      languageLevel: null,
      englishOk: null,
      anerkennungRequired: null,
      visaPathway: null,
      anerkennungSupport: null,
      visaSponsorship: null,
      relocationSupport: long,
    }
    const parsed = JobSignalsSchema.parse(raw)
    expect(parsed.relocationSupport!.length).toBeLessThanOrEqual(200)
  })
})

describe("computeSignalsHash", () => {
  it("produces a stable 64-char hex hash for identical input", () => {
    const a = computeSignalsHash("Senior Pflegefachkraft", "Wir suchen ...")
    const b = computeSignalsHash("Senior Pflegefachkraft", "Wir suchen ...")
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it("differs when title or description changes", () => {
    const a = computeSignalsHash("Pflegefachkraft", "X")
    const b = computeSignalsHash("Pflegefachkraft", "Y")
    expect(a).not.toBe(b)
  })

  it("treats null and empty description identically", () => {
    const a = computeSignalsHash("X", null)
    const b = computeSignalsHash("X", "")
    expect(a).toBe(b)
  })
})

vi.mock("@/lib/gemini-client", () => ({
  generateContent: vi.fn(),
  isGeminiAvailable: vi.fn(() => true),
}))

describe("extractSignals", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("returns parsed signals when Gemini returns valid JSON", async () => {
    const { generateContent } = await import("@/lib/gemini-client")
    ;(generateContent as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      content: JSON.stringify({
        languageLevel: "B2",
        englishOk: false,
        anerkennungRequired: "REQUIRED",
        visaPathway: "PFLEGE_VISA",
        anerkennungSupport: true,
        visaSponsorship: true,
        relocationSupport: null,
      }),
    })
    const { extractSignals } = await import("@/lib/job-signals")
    const result = await extractSignals({
      title: "Pflegefachkraft (m/w/d)",
      description: "Wir bieten Anerkennungsunterstützung",
      requirements: ["B2 Deutsch"],
    })
    expect(result.signals?.languageLevel).toBe("B2")
    expect(result.error).toBeUndefined()
  })

  it("returns an error when Gemini response is not valid JSON", async () => {
    const { generateContent } = await import("@/lib/gemini-client")
    ;(generateContent as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      content: "not json",
    })
    const { extractSignals } = await import("@/lib/job-signals")
    const result = await extractSignals({
      title: "X",
      description: "Y",
      requirements: [],
    })
    expect(result.signals).toBeUndefined()
    expect(result.error).toMatch(/parse/i)
  })

  it("returns an error when Gemini API itself fails", async () => {
    const { generateContent } = await import("@/lib/gemini-client")
    ;(generateContent as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: "rate limit",
    })
    const { extractSignals } = await import("@/lib/job-signals")
    const result = await extractSignals({
      title: "X",
      description: "Y",
      requirements: [],
    })
    expect(result.signals).toBeUndefined()
    expect(result.error).toBe("rate limit")
  })
})
```

- [ ] **Step 3.2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/job-signals.test.ts`
Expected: FAIL with `Cannot find module '@/lib/job-signals'`.

- [ ] **Step 3.3: Implement `lib/job-signals.ts`**

Create `lib/job-signals.ts`:

```typescript
/**
 * Migrant-relevant signal extraction for JobPosting rows.
 *
 * Wraps Gemini 2.5 Flash Lite with a strict Zod schema so callers receive
 * either a fully validated signal record or an explicit error string.
 *
 * The companion `signalsHash` is the cache key callers use to skip
 * extraction when title+description haven't changed across re-scrapes.
 */

import { z } from "zod"
import { createHash } from "node:crypto"
import { generateContent } from "@/lib/gemini-client"

export const JobSignalsSchema = z.object({
  languageLevel: z
    .enum(["A1", "A2", "B1", "B2", "C1", "C2", "NONE"])
    .nullable(),
  englishOk: z.boolean().nullable(),
  anerkennungRequired: z
    .enum(["REQUIRED", "IN_PROGRESS_OK", "NOT_REQUIRED"])
    .nullable(),
  visaPathway: z
    .enum([
      "BLUE_CARD",
      "CHANCENKARTE",
      "PFLEGE_VISA",
      "AUSBILDUNG",
      "FSJ",
      "EU_ONLY",
      "UNCLEAR",
    ])
    .nullable(),
  anerkennungSupport: z.boolean().nullable(),
  visaSponsorship: z.boolean().nullable(),
  relocationSupport: z
    .string()
    .nullable()
    .transform((v) => (v ? v.slice(0, 200) : v)),
})

export type JobSignals = z.infer<typeof JobSignalsSchema>

export interface ExtractInput {
  title: string
  description: string | null
  requirements: string[]
}

export interface ExtractResult {
  signals?: JobSignals
  error?: string
}

export function computeSignalsHash(title: string, description: string | null): string {
  const payload = `${title}\n${description ?? ""}`
  return createHash("sha256").update(payload).digest("hex")
}

const SYSTEM_PROMPT = `You classify German job postings for migrant relevance.

Output STRICT JSON matching this TypeScript type (no markdown, no prose):
{
  "languageLevel": "A1"|"A2"|"B1"|"B2"|"C1"|"C2"|"NONE"|null,
  "englishOk": boolean|null,
  "anerkennungRequired": "REQUIRED"|"IN_PROGRESS_OK"|"NOT_REQUIRED"|null,
  "visaPathway": "BLUE_CARD"|"CHANCENKARTE"|"PFLEGE_VISA"|"AUSBILDUNG"|"FSJ"|"EU_ONLY"|"UNCLEAR"|null,
  "anerkennungSupport": boolean|null,
  "visaSponsorship": boolean|null,
  "relocationSupport": string|null
}

Conventions:
- "verhandlungssicher" / "fließend" ≈ C1; "sehr gute" ≈ B2; "gute" ≈ B1.
- Anerkennung applies to regulated professions (Ärzte, Pflege, Lehrer, Anwälte). For other professions return NOT_REQUIRED.
- visaPathway: salaries above ~€48,300 in shortage roles → BLUE_CARD. Pflege roles → PFLEGE_VISA. Vocational training → AUSBILDUNG. EU-only requirement → EU_ONLY. Otherwise UNCLEAR.
- anerkennungSupport: true ONLY when the posting explicitly says the employer helps with Anerkennung/Approbation.
- visaSponsorship: true ONLY when the posting explicitly mentions visa sponsorship or hiring from abroad.
- relocationSupport: short German phrase (≤200 chars) summarising any relocation perks; null if none mentioned.
- Use null when the posting genuinely doesn't say. Do not guess.`

export async function extractSignals(input: ExtractInput): Promise<ExtractResult> {
  const userPrompt = `Title: ${input.title}
Requirements: ${input.requirements.join(" · ") || "(none)"}
Description:
${input.description ?? "(no description provided)"}`

  const res = await generateContent(`${SYSTEM_PROMPT}\n\n---\n\n${userPrompt}`)
  if (!res.success || !res.content) {
    return { error: res.error || "Gemini returned no content" }
  }

  // Strip code fences if model wrapped JSON despite instructions
  const cleaned = res.content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()

  let raw: unknown
  try {
    raw = JSON.parse(cleaned)
  } catch (e) {
    return { error: `failed to parse Gemini JSON: ${(e as Error).message}` }
  }

  const parsed = JobSignalsSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: `schema validation failed: ${parsed.error.message}` }
  }

  return { signals: parsed.data }
}
```

- [ ] **Step 3.4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/job-signals.test.ts`
Expected: PASS, 8 tests green.

- [ ] **Step 3.5: Commit**

```bash
git add lib/job-signals.ts lib/__tests__/job-signals.test.ts
git commit -m "feat(jobs): Gemini-backed migrant signal extractor + cache hash"
```

---

## Task 4: Signal worker cron route

**Files:**
- Create: `app/api/cron/signal-worker/route.ts`

- [ ] **Step 4.1: Implement the cron route**

Create `app/api/cron/signal-worker/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyCronSecret } from "@/lib/api-permissions"
import { computeSignalsHash, extractSignals } from "@/lib/job-signals"

export const maxDuration = 300

const BATCH_SIZE = 100
const MAX_ATTEMPTS = 3

// GET /api/cron/signal-worker — Async signal extraction for unsignaled jobs.
// Skips Kimi-Claw-pushed jobs (their signals arrive in the ingest payload).
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startedAt = Date.now()
  let processed = 0
  let succeeded = 0
  let failed = 0
  let exhausted = 0

  try {
    const jobs = await prisma.jobPosting.findMany({
      where: {
        signalsExtractedAt: null,
        source: { isPushSource: false },
      },
      orderBy: { postedAt: "desc" },
      take: BATCH_SIZE,
      select: {
        id: true,
        title: true,
        description: true,
        requirements: true,
        signalAttempt: { select: { attempts: true } },
      },
    })

    for (const job of jobs) {
      processed++
      const previousAttempts = job.signalAttempt?.attempts ?? 0

      const hash = computeSignalsHash(job.title, job.description)
      const result = await extractSignals({
        title: job.title,
        description: job.description,
        requirements: job.requirements,
      })

      if (result.signals) {
        await prisma.$transaction([
          prisma.jobPosting.update({
            where: { id: job.id },
            data: {
              ...result.signals,
              signalsExtractedAt: new Date(),
              signalsHash: hash,
            },
          }),
          prisma.jobSignalAttempt.deleteMany({ where: { jobId: job.id } }),
        ])
        succeeded++
        continue
      }

      const nextAttempts = previousAttempts + 1
      if (nextAttempts >= MAX_ATTEMPTS) {
        // Stop retrying — mark extracted-with-no-signals so future runs skip.
        await prisma.$transaction([
          prisma.jobPosting.update({
            where: { id: job.id },
            data: {
              signalsExtractedAt: new Date(),
              signalsHash: hash,
            },
          }),
          prisma.jobSignalAttempt.deleteMany({ where: { jobId: job.id } }),
        ])
        exhausted++
      } else {
        await prisma.jobSignalAttempt.upsert({
          where: { jobId: job.id },
          create: {
            jobId: job.id,
            attempts: nextAttempts,
            lastAttemptAt: new Date(),
            lastError: result.error?.slice(0, 500) ?? null,
          },
          update: {
            attempts: nextAttempts,
            lastAttemptAt: new Date(),
            lastError: result.error?.slice(0, 500) ?? null,
          },
        })
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      succeeded,
      failed,
      exhausted,
      durationMs: Date.now() - startedAt,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[Cron:signal-worker] Error:", msg)
    return NextResponse.json({ error: `Signal worker failed: ${msg}` }, { status: 500 })
  }
}
```

- [ ] **Step 4.2: Manual smoke test via local dev server**

Start the dev server in one terminal: `npm run dev`. In another terminal:
```bash
curl -s -H "Authorization: Bearer $(grep CRON_SECRET .env | cut -d= -f2)" http://localhost:3000/api/cron/signal-worker | head -c 400
```
Expected: JSON like `{"success":true,"processed":N,"succeeded":N,"failed":0,"exhausted":0,"durationMs":...}`. If `GEMINI_API_KEY` isn't set locally, you'll see `failed > 0` with errors logged — that's still a green smoke test for routing/auth/Prisma.

- [ ] **Step 4.3: Commit**

```bash
git add app/api/cron/signal-worker/route.ts
git commit -m "feat(jobs): async signal worker cron with retry + exhaustion handling"
```

---

## Task 5: Extend `/api/jobs/ingest` Zod schema

**Files:**
- Modify: `app/api/jobs/ingest/route.ts`

- [ ] **Step 5.1: Extend the per-job Zod schema with the seven signal fields**

Open `app/api/jobs/ingest/route.ts`. Locate the `jobSchema` declaration (lines 7–23). Replace it with:

```typescript
const jobSchema = z.object({
  title: z.string().min(1).max(200),
  company: z.string().min(1).max(100),
  location: z.string().max(50).nullish(),
  salaryMin: z.number().nullish(),
  salaryMax: z.number().nullish(),
  currency: z.string().default("EUR"),
  germanLevel: z.string().nullish(),
  profession: z.string().nullish(),
  jobType: z.string().nullish(),
  requirements: z.array(z.string()).default([]),
  applyUrl: z.string().max(500).nullish(),
  externalId: z.string().min(1).max(100),
  description: z.string().max(500).nullish(),
  grade: z.enum(["A", "B", "C", "D"]).nullish(),
  gradeReason: z.string().max(200).nullish(),

  // Migrant signals (optional — Kimi Claw populates when scraping)
  languageLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2", "NONE"]).nullish(),
  englishOk: z.boolean().nullish(),
  anerkennungRequired: z
    .enum(["REQUIRED", "IN_PROGRESS_OK", "NOT_REQUIRED"])
    .nullish(),
  visaPathway: z
    .enum([
      "BLUE_CARD",
      "CHANCENKARTE",
      "PFLEGE_VISA",
      "AUSBILDUNG",
      "FSJ",
      "EU_ONLY",
      "UNCLEAR",
    ])
    .nullish(),
  anerkennungSupport: z.boolean().nullish(),
  visaSponsorship: z.boolean().nullish(),
  relocationSupport: z.string().max(200).nullish(),
})
```

- [ ] **Step 5.2: Persist the signals when present and stamp `signalsExtractedAt`**

In the same file, find the `prisma.jobPosting.upsert` call (around line 104). Replace its `create` and `update` blocks with:

```typescript
        const hasSignals =
          job.languageLevel != null ||
          job.englishOk != null ||
          job.anerkennungRequired != null ||
          job.visaPathway != null ||
          job.anerkennungSupport != null ||
          job.visaSponsorship != null ||
          job.relocationSupport != null

        await prisma.jobPosting.upsert({
          where: { externalId: job.externalId },
          create: {
            sourceId: jobSource.id,
            externalId: job.externalId,
            slug: finalSlug,
            title,
            company,
            location: job.location || null,
            description: job.description || null,
            salaryMin: job.salaryMin || null,
            salaryMax: job.salaryMax || null,
            currency: job.currency,
            germanLevel: job.germanLevel || null,
            profession,
            jobType: job.jobType || null,
            requirements: job.requirements,
            applyUrl: job.applyUrl || null,
            grade: job.grade || null,
            gradeReason: job.gradeReason || null,
            postedAt: new Date(),
            active: true,
            languageLevel: job.languageLevel ?? null,
            englishOk: job.englishOk ?? null,
            anerkennungRequired: job.anerkennungRequired ?? null,
            visaPathway: job.visaPathway ?? null,
            anerkennungSupport: job.anerkennungSupport ?? null,
            visaSponsorship: job.visaSponsorship ?? null,
            relocationSupport: job.relocationSupport ?? null,
            signalsExtractedAt: hasSignals ? new Date() : null,
          },
          update: {
            title,
            company,
            location: job.location || null,
            description: job.description || null,
            salaryMin: job.salaryMin || null,
            salaryMax: job.salaryMax || null,
            germanLevel: job.germanLevel || null,
            profession,
            jobType: job.jobType || null,
            requirements: job.requirements,
            applyUrl: job.applyUrl || null,
            grade: job.grade || null,
            gradeReason: job.gradeReason || null,
            active: true,
            updatedAt: new Date(),
            ...(hasSignals && {
              languageLevel: job.languageLevel ?? null,
              englishOk: job.englishOk ?? null,
              anerkennungRequired: job.anerkennungRequired ?? null,
              visaPathway: job.visaPathway ?? null,
              anerkennungSupport: job.anerkennungSupport ?? null,
              visaSponsorship: job.visaSponsorship ?? null,
              relocationSupport: job.relocationSupport ?? null,
              signalsExtractedAt: new Date(),
            }),
          },
        })
```

- [ ] **Step 5.3: Mark Kimi Claw sources as push sources**

Still in the same file, find the `prisma.jobSource.upsert` call (around line 59). Replace it with:

```typescript
    const jobSource = await prisma.jobSource.upsert({
      where: { name: sourceName },
      create: {
        name: sourceName,
        url: sourceUrl,
        active: true,
        isPushSource: true,
      },
      update: {
        isPushSource: true,
      },
    })
```

- [ ] **Step 5.4: Smoke-test ingest with an example payload**

With dev server still running:
```bash
curl -s -X POST -H "Authorization: Bearer $(grep CRON_SECRET .env | cut -d= -f2)" \
  -H "Content-Type: application/json" \
  -d '{"source":"kimi-claw-test","sourceUrl":"https://example.com/jobs","jobs":[{"title":"Test Pflegefachkraft","company":"Test GmbH","externalId":"smoke-1","languageLevel":"B2","anerkennungRequired":"IN_PROGRESS_OK","visaPathway":"PFLEGE_VISA","englishOk":false,"anerkennungSupport":true,"visaSponsorship":true,"relocationSupport":"Umzugskostenzuschuss"}]}' \
  http://localhost:3000/api/jobs/ingest
```
Expected: `{"success":true,"upserted":1,"source":"example.com (kimi-claw-test)"}`. Then verify in `npx prisma studio` → JobPosting → row with `externalId=smoke-1` has all 7 signal fields populated AND `signalsExtractedAt IS NOT NULL`. Delete the row when done.

- [ ] **Step 5.5: Commit**

```bash
git add app/api/jobs/ingest/route.ts
git commit -m "feat(jobs): accept migrant signals in /api/jobs/ingest payload"
```

---

## Task 6: Wire keyword rotation into the scraper cron

**Files:**
- Modify: `lib/job-scraper.ts`
- Modify: `app/api/cron/job-scraper/route.ts`

- [ ] **Step 6.1: Export a multi-keyword Arbeitsagentur fetcher from `lib/job-scraper.ts`**

Open `lib/job-scraper.ts`. Just below the existing `fetchArbeitsagentur` function (which is currently single-keyword, called via `scrapeAllSources`), add a new exported helper that fetches per keyword and writes to the DB the same way `scrapeAllSources` does. Add this near the bottom of the file, before any default export. The helper uses `fetchArbeitsagentur`, `cleanJobTitle`, `generateJobSlug`, and `prisma` — all already in scope from earlier in the file:

```typescript
/**
 * Fetch jobs for a single Arbeitsagentur keyword and upsert them via the same
 * path used by scrapeAllSources. Returns count of jobs upserted.
 *
 * Used by the keyword-rotation cron (Task 6 of migrant-aware-scraping plan).
 */
export async function scrapeArbeitsagenturKeyword(keyword: string): Promise<{
  keyword: string
  fetched: number
  upserted: number
  error?: string
}> {
  const url = `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs?was=${encodeURIComponent(keyword)}`
  try {
    const jobs = await fetchArbeitsagentur(url)
    let upserted = 0

    // Find-or-create JobSource keyed by the keyword so we can track per-keyword freshness
    const sourceName = `arbeitsagentur (${keyword})`
    const jobSource = await prisma.jobSource.upsert({
      where: { name: sourceName },
      create: { name: sourceName, url, active: true, isPushSource: false },
      update: { isPushSource: false },
    })

    for (const job of jobs) {
      try {
        const externalId = job.externalId || `${keyword}-${job.title}-${job.company}`.slice(0, 100)
        const slug = generateJobSlug(job.title, job.company, job.location || null)
        const existing = await prisma.jobPosting.findUnique({
          where: { slug },
          select: { id: true, externalId: true },
        })
        const finalSlug = existing && existing.externalId !== externalId
          ? `${slug}-${externalId.slice(-6)}`
          : slug

        await prisma.jobPosting.upsert({
          where: { externalId },
          create: {
            sourceId: jobSource.id,
            externalId,
            slug: finalSlug,
            title: cleanJobTitle(job.title),
            company: cleanJobTitle(job.company),
            location: job.location || null,
            salaryMin: job.salaryMin || null,
            salaryMax: job.salaryMax || null,
            currency: job.currency || "EUR",
            germanLevel: job.germanLevel || null,
            profession: job.profession || null,
            jobType: job.jobType || null,
            requirements: job.requirements || [],
            applyUrl: job.applyUrl || null,
            postedAt: new Date(),
            active: true,
          },
          update: {
            title: cleanJobTitle(job.title),
            company: cleanJobTitle(job.company),
            location: job.location || null,
            germanLevel: job.germanLevel || null,
            profession: job.profession || null,
            jobType: job.jobType || null,
            requirements: job.requirements || [],
            applyUrl: job.applyUrl || null,
            active: true,
            updatedAt: new Date(),
          },
        })
        upserted++
      } catch (e) {
        console.error(`[Scraper:${keyword}] upsert failed:`, e)
      }
    }

    await prisma.jobSource.update({
      where: { id: jobSource.id },
      data: { lastFetched: new Date() },
    })

    return { keyword, fetched: jobs.length, upserted }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { keyword, fetched: 0, upserted: 0, error: msg }
  }
}
```

- [ ] **Step 6.2: Replace the cron route with the rotation orchestrator**

Open `app/api/cron/job-scraper/route.ts`. Replace its entire contents with:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { generateJobSlug, scrapeArbeitsagenturKeyword } from "@/lib/job-scraper"
import { verifyCronSecret } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"
import { sendText } from "@/lib/whatsapp"
import { nextChunk, KEYWORD_CHUNK_SIZE } from "@/lib/job-source-config"

export const maxDuration = 300

// GET /api/cron/job-scraper — hourly chunked Arbeitsagentur keyword rotation.
// Each run advances a Postgres-backed cursor so we cycle through ~25 keywords
// over ~6 hours instead of slamming a single keyword per call.
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const state = await prisma.jobScrapeState.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", keywordCursor: 0 },
      update: {},
    })

    const { keywords, nextCursor } = nextChunk(state.keywordCursor)

    console.log(
      `[Cron] Scraping keywords [${keywords.join(", ")}] (cursor ${state.keywordCursor} → ${nextCursor})`
    )

    const results = await Promise.all(
      keywords.map((kw) => scrapeArbeitsagenturKeyword(kw))
    )

    await prisma.jobScrapeState.update({
      where: { id: "singleton" },
      data: { keywordCursor: nextCursor },
    })

    const totalUpserted = results.reduce((acc, r) => acc + r.upserted, 0)
    const failed = results.filter((r) => r.error)

    if (failed.length > 0) {
      console.warn(
        "[Cron] Failed keywords:",
        failed.map((f) => `${f.keyword}: ${f.error}`).join("; ")
      )
    }

    const slugsBackfilled = await backfillSlugs()
    await checkKimiClawStaleness()

    return NextResponse.json({
      success: true,
      keywords,
      nextCursor,
      chunkSize: KEYWORD_CHUNK_SIZE,
      totalUpserted,
      results,
      slugsBackfilled,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[Cron] Job scraper error:", msg)
    return NextResponse.json({ error: `Scraping failed: ${msg}` }, { status: 500 })
  }
}

// (Existing helpers retained from the previous version of this file.)

async function backfillSlugs(): Promise<number> {
  try {
    const jobsWithoutSlug = await prisma.jobPosting.findMany({
      where: { slug: null },
      select: { id: true, externalId: true, title: true, company: true, location: true },
      take: 200,
    })
    if (jobsWithoutSlug.length === 0) return 0
    let updated = 0
    for (const job of jobsWithoutSlug) {
      try {
        const slug = generateJobSlug(job.title, job.company, job.location)
        const existing = await prisma.jobPosting.findUnique({
          where: { slug },
          select: { id: true },
        })
        const finalSlug = existing && existing.id !== job.id
          ? `${slug}-${(job.externalId || job.id).slice(-6)}`
          : slug
        await prisma.jobPosting.update({
          where: { id: job.id },
          data: { slug: finalSlug },
        })
        updated++
      } catch (error) {
        console.error(`[Cron] Failed to backfill slug for job ${job.id}:`, error)
      }
    }
    console.log(`[Cron] Backfilled slugs for ${updated}/${jobsWithoutSlug.length} jobs`)
    return updated
  } catch (error) {
    console.error("[Cron] Slug backfill failed:", error)
    return 0
  }
}

async function checkKimiClawStaleness() {
  try {
    const kimiSources = await prisma.jobSource.findMany({
      where: { active: true, isPushSource: true },
      select: { name: true, lastFetched: true },
    })
    if (kimiSources.length === 0) return
    const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000)
    const allStale = kimiSources.every(
      (s) => !s.lastFetched || s.lastFetched < cutoff
    )
    if (allStale) {
      console.warn("[Cron] Kimi Claw has not pushed data in 36+ hours")
      const founderPhone = process.env.FOUNDER_WHATSAPP
      if (founderPhone && process.env.WHATSAPP_TOKEN) {
        await sendText(
          founderPhone,
          "⚠️ Kimi Claw hasn't pushed job data in 36+ hours. Check the kimi.ai dashboard."
        ).catch((err) => console.error("[Cron] WhatsApp alert failed:", err))
      }
    }
  } catch (error) {
    console.error("[Cron] Kimi Claw staleness check failed:", error)
  }
}
```

Note: this replaces the previous `scrapeAllSources()`-driven version with the rotation orchestrator. Existing API consumers of `scrapeAllSources` (search the codebase first with `Grep`) — if any callers exist, leave the old function in `lib/job-scraper.ts` for them. The cron route no longer imports it.

- [ ] **Step 6.3: Smoke-test the rotation route**

```bash
curl -s -H "Authorization: Bearer $(grep CRON_SECRET .env | cut -d= -f2)" http://localhost:3000/api/cron/job-scraper | head -c 600
```
Expected: JSON with `keywords` (array of 4 strings), `nextCursor` (a number), `totalUpserted` (≥0), `results` (per-keyword breakdown). Run it twice — `nextCursor` should advance.

- [ ] **Step 6.4: Commit**

```bash
git add lib/job-scraper.ts app/api/cron/job-scraper/route.ts
git commit -m "feat(jobs): chunked Arbeitsagentur keyword rotation in scraper cron"
```

---

## Task 7: Backfill script

**Files:**
- Create: `scripts/backfill-signals.ts`

- [ ] **Step 7.1: Implement the backfill script**

Create `scripts/backfill-signals.ts`:

```typescript
/**
 * One-time backfill: extract migrant signals for every JobPosting in the DB
 * that hasn't been processed yet (signalsExtractedAt IS NULL) and isn't from
 * a push-source (those arrive pre-signaled).
 *
 * Usage: npx tsx scripts/backfill-signals.ts
 */

import "dotenv/config"
import { prisma } from "@/lib/prisma"
import { computeSignalsHash, extractSignals } from "@/lib/job-signals"

const BATCH_SIZE = 50
const CONCURRENCY = 5

async function processBatch(jobs: Array<{
  id: string
  title: string
  description: string | null
  requirements: string[]
}>) {
  let succeeded = 0
  let failed = 0
  const queue = [...jobs]
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length > 0) {
        const job = queue.shift()
        if (!job) return
        const hash = computeSignalsHash(job.title, job.description)
        const result = await extractSignals({
          title: job.title,
          description: job.description,
          requirements: job.requirements,
        })
        if (result.signals) {
          await prisma.jobPosting.update({
            where: { id: job.id },
            data: {
              ...result.signals,
              signalsExtractedAt: new Date(),
              signalsHash: hash,
            },
          })
          succeeded++
        } else {
          console.warn(`[backfill] ${job.id} ${job.title}: ${result.error}`)
          failed++
        }
      }
    })
  )
  return { succeeded, failed }
}

async function main() {
  let totalSucceeded = 0
  let totalFailed = 0
  let cursor: string | undefined
  while (true) {
    const jobs = await prisma.jobPosting.findMany({
      where: {
        signalsExtractedAt: null,
        source: { isPushSource: false },
      },
      orderBy: { id: "asc" },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: BATCH_SIZE,
      select: { id: true, title: true, description: true, requirements: true },
    })
    if (jobs.length === 0) break
    cursor = jobs[jobs.length - 1].id
    const { succeeded, failed } = await processBatch(jobs)
    totalSucceeded += succeeded
    totalFailed += failed
    console.log(`[backfill] batch done: ${succeeded} ok / ${failed} failed (running total: ${totalSucceeded} / ${totalFailed})`)
  }
  console.log(`[backfill] DONE: ${totalSucceeded} succeeded, ${totalFailed} failed`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

- [ ] **Step 7.2: Dry-run on local DB (optional — only run if you have GEMINI_API_KEY locally)**

If `GEMINI_API_KEY` is set locally and you want to test:
```bash
npx tsx scripts/backfill-signals.ts
```
Expected: progress logs every batch, final `DONE` line. Cost ≈ €0.0003 per local job. Skip this step if your local DB is empty or the key isn't set; production run happens in the rollout (Task 12).

- [ ] **Step 7.3: Commit**

```bash
git add scripts/backfill-signals.ts
git commit -m "feat(jobs): backfill script for existing unsignaled jobs"
```

---

## Task 8: vercel.json — hourly scraper + signal-worker schedule

**Files:**
- Modify: `vercel.json`

- [ ] **Step 8.1: Update the cron schedules**

Open `vercel.json`. Replace the existing `/api/cron/job-scraper` entry (single daily 6 AM run) with hourly, and add the new signal-worker every 15 min. The relevant slice of `crons` should become:

```json
    {
      "path": "/api/cron/job-scraper",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/signal-worker",
      "schedule": "*/15 * * * *"
    },
```

(Replace the old `/api/cron/job-scraper` block; insert the `/api/cron/signal-worker` block immediately after it. Leave every other cron entry untouched.)

- [ ] **Step 8.2: Commit**

```bash
git add vercel.json
git commit -m "ops(jobs): hourly scraper + 15-min signal-worker crons"
```

---

## Task 9: Free filter UI — "Migrant fit" group

**Files:**
- Create: `components/jobs-portal/MigrantFitFilters.tsx`
- Modify: the filter sidebar parent in `app/jobs/student-jobs/`

- [ ] **Step 9.1: Locate the existing filter sidebar**

Run:
```bash
ls /Users/deepak/plan-beta-dashboard/app/jobs/student-jobs/
```
Then identify the filter-sidebar host. Likely candidates: `app/jobs/student-jobs/page.tsx`, or a `FilterSidebar.tsx` / `Filters.tsx` component imported from there. Open whichever file owns the existing filters (city, jobType, salary). Note its filter-state shape (likely a controlled state object passed via props).

- [ ] **Step 9.2: Implement the new free filter component**

Create `components/jobs-portal/MigrantFitFilters.tsx`:

```typescript
"use client"

import { useCallback } from "react"

export type MigrantFitState = {
  languageLevels: string[]    // multi-select: A1..C2, NONE
  englishOk: boolean | null   // tri: true / null
  anerkennung: string[]       // multi: REQUIRED, IN_PROGRESS_OK, NOT_REQUIRED
  visaPathways: string[]      // multi: BLUE_CARD, CHANCENKARTE, ...
}

const LANGUAGE_OPTIONS = [
  { value: "A1", label: "A1" },
  { value: "A2", label: "A2" },
  { value: "B1", label: "B1" },
  { value: "B2", label: "B2" },
  { value: "C1", label: "C1" },
  { value: "C2", label: "C2" },
  { value: "NONE", label: "Keine Angabe" },
]

const ANERKENNUNG_OPTIONS = [
  { value: "REQUIRED", label: "Erforderlich" },
  { value: "IN_PROGRESS_OK", label: "In Bearbeitung OK" },
  { value: "NOT_REQUIRED", label: "Nicht erforderlich" },
]

const VISA_OPTIONS = [
  { value: "BLUE_CARD", label: "Blue Card" },
  { value: "CHANCENKARTE", label: "Chancenkarte" },
  { value: "PFLEGE_VISA", label: "Pflege-Visum" },
  { value: "AUSBILDUNG", label: "Ausbildung" },
  { value: "FSJ", label: "FSJ / BFD" },
]

interface Props {
  value: MigrantFitState
  onChange: (next: MigrantFitState) => void
}

export function MigrantFitFilters({ value, onChange }: Props) {
  const toggle = useCallback(
    (key: "languageLevels" | "anerkennung" | "visaPathways", option: string) => {
      const current = value[key]
      const next = current.includes(option)
        ? current.filter((v) => v !== option)
        : [...current, option]
      onChange({ ...value, [key]: next })
    },
    [value, onChange]
  )

  return (
    <section className="space-y-4">
      <h3 className="font-semibold text-sm text-foreground">Migrant fit</h3>

      <div>
        <p className="text-xs text-muted-foreground mb-2">Sprachniveau</p>
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGE_OPTIONS.map((opt) => {
            const active = value.languageLevels.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle("languageLevels", opt.value)}
                className={`px-2 py-1 rounded text-xs border transition ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value.englishOk === true}
            onChange={(e) =>
              onChange({ ...value, englishOk: e.target.checked ? true : null })
            }
          />
          <span className="text-sm">English-friendly only</span>
        </label>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2">Anerkennung</p>
        <div className="space-y-1">
          {ANERKENNUNG_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={value.anerkennung.includes(opt.value)}
                onChange={() => toggle("anerkennung", opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2">Visa-Weg</p>
        <div className="space-y-1">
          {VISA_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={value.visaPathways.includes(opt.value)}
                onChange={() => toggle("visaPathways", opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 9.3: Mount the component in the filter sidebar parent and wire URL params**

In the filter-sidebar host file (identified in Step 9.1), import and render `MigrantFitFilters`:

```typescript
import { MigrantFitFilters, MigrantFitState } from "@/components/jobs-portal/MigrantFitFilters"
```

Add `MigrantFitState` to the controlled state shape, initialise from URL params (`lang`, `english`, `anerkennung`, `visa`), pass into the component, and serialise back to the URL on change. Reuse the existing pattern this file already uses for jobType / city — DO NOT invent a new query-param mechanism. Multi-select values join with comma; booleans serialise as `1` / absent.

Also extend the existing data fetch (likely `/api/jobs/list` or similar — search with `Grep` for `student-jobs` API endpoints) to forward the new filters to the backend Prisma `where` clause:

```typescript
// In whichever API route serves the jobs list:
const langs = req.nextUrl.searchParams.get("lang")?.split(",").filter(Boolean) ?? []
const where: Prisma.JobPostingWhereInput = {
  // ... existing filters ...
  ...(langs.length > 0 && {
    languageLevel: { in: langs as LanguageLevel[] },
  }),
  ...(req.nextUrl.searchParams.get("english") === "1" && { englishOk: true }),
  ...(/* anerkennung */ []),
  ...(/* visa */ []),
}
```

Apply the same `in` pattern for `anerkennungRequired` and `visaPathway` arrays.

- [ ] **Step 9.4: Manual UI test**

Run `npm run dev`. Visit `http://localhost:3000/jobs/student-jobs`. Confirm:
- Sidebar shows "Migrant fit" section with 4 sub-controls
- Clicking language pills updates URL (`?lang=B2,C1`)
- Toggling "English-friendly only" updates URL (`?english=1`) and filters results
- Anerkennung + Visa multi-select checkboxes update URL and filter

If the local DB has no jobs with signals yet, run a few rows through `/api/cron/signal-worker` first, or seed a couple of JobPostings with signals via Prisma Studio for testing.

- [ ] **Step 9.5: Commit**

```bash
git add components/jobs-portal/MigrantFitFilters.tsx app/jobs/student-jobs/
git commit -m "feat(jobs-portal): free 'Migrant fit' filter group with URL state"
```

---

## Task 10: Premium filter UI — "Visa & support" group

**Files:**
- Create: `components/jobs-portal/VisaSupportFilters.tsx`
- Modify: the same sidebar parent as Task 9

- [ ] **Step 10.1: Locate the existing PremiumGate / SubscriptionModal**

Run:
```bash
grep -rn "PremiumGate" /Users/deepak/plan-beta-dashboard/components /Users/deepak/plan-beta-dashboard/app 2>/dev/null | head -5
```
Identify the import path. Confirm `usePortalAuth()` from `lib/jobs-portal-auth.ts` exposes `isPremium` (or similar) — read that file briefly.

- [ ] **Step 10.2: Implement the premium filter component**

Create `components/jobs-portal/VisaSupportFilters.tsx`:

```typescript
"use client"

import { useCallback } from "react"
import { PremiumGate } from "@/components/jobs-portal/PremiumGate" // adjust path if different

export type VisaSupportState = {
  anerkennungSupport: boolean | null
  visaSponsorship: boolean | null
  relocationSupport: boolean | null
}

interface Props {
  value: VisaSupportState
  onChange: (next: VisaSupportState) => void
}

export function VisaSupportFilters({ value, onChange }: Props) {
  const toggle = useCallback(
    (key: keyof VisaSupportState) => {
      onChange({ ...value, [key]: value[key] === true ? null : true })
    },
    [value, onChange]
  )

  return (
    <PremiumGate
      lockedTitle="Visa & support filters"
      lockedDescription="Filter for employers that sponsor visas, support Anerkennung, or offer relocation help."
    >
      <section className="space-y-3">
        <h3 className="font-semibold text-sm text-foreground">Visa & support</h3>

        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={value.anerkennungSupport === true}
            onChange={() => toggle("anerkennungSupport")}
          />
          Anerkennung-Unterstützung
        </label>

        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={value.visaSponsorship === true}
            onChange={() => toggle("visaSponsorship")}
          />
          Visa-Sponsoring
        </label>

        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={value.relocationSupport === true}
            onChange={() => toggle("relocationSupport")}
          />
          Relocation-Support
        </label>
      </section>
    </PremiumGate>
  )
}
```

If your existing `PremiumGate` API is different from `lockedTitle`/`lockedDescription` props, adjust the wrapper invocation to match it (the gate's job is "show children if premium, otherwise show lock + upgrade CTA").

- [ ] **Step 10.3: Mount in the sidebar and forward to the API**

Same pattern as Task 9 — add `VisaSupportState` to the sidebar state, initialise from URL (`as=1`, `vs=1`, `rs=1`), pass into the component, serialise on change. Backend filter slice:

```typescript
...(req.nextUrl.searchParams.get("as") === "1" && { anerkennungSupport: true }),
...(req.nextUrl.searchParams.get("vs") === "1" && { visaSponsorship: true }),
...(req.nextUrl.searchParams.get("rs") === "1" && { relocationSupport: { not: null } }),
```

For the relocation filter use `{ not: null }` because it's a free-text field (the user filters for "any relocation support mentioned" rather than a specific value).

- [ ] **Step 10.4: Manual UI test**

Run `npm run dev`. Visit `/jobs/student-jobs` as a free user (clear `pb-jobs-token` from localStorage if needed). Confirm:
- "Visa & support" section appears with the lock UI / upgrade CTA
- Click upgrade CTA → SubscriptionModal opens
- Switch to a premium token (trigger the activate flow or set localStorage manually) → checkboxes appear and are interactive
- Toggling them updates URL params and filters results

- [ ] **Step 10.5: Commit**

```bash
git add components/jobs-portal/VisaSupportFilters.tsx app/jobs/student-jobs/
git commit -m "feat(jobs-portal): premium 'Visa & support' filter group with PremiumGate"
```

---

## Task 11: Job detail page — signal badges

**Files:**
- Create: `components/jobs-portal/SignalBadges.tsx`
- Modify: `app/jobs/student-jobs/job/[slug]/page.tsx`

- [ ] **Step 11.1: Implement the badges component**

Create `components/jobs-portal/SignalBadges.tsx`:

```typescript
import { LockClosedIcon } from "@heroicons/react/24/solid" // adjust import if heroicons isn't installed; otherwise use any lock svg

type Props = {
  languageLevel: string | null
  englishOk: boolean | null
  anerkennungRequired: string | null
  visaPathway: string | null
  anerkennungSupport: boolean | null
  visaSponsorship: boolean | null
  relocationSupport: string | null
  isPremium: boolean
}

const VISA_LABELS: Record<string, string> = {
  BLUE_CARD: "Blue Card",
  CHANCENKARTE: "Chancenkarte",
  PFLEGE_VISA: "Pflege-Visum",
  AUSBILDUNG: "Ausbildung",
  FSJ: "FSJ / BFD",
  EU_ONLY: "EU only",
  UNCLEAR: "Visa unclear",
}

const ANERKENNUNG_LABELS: Record<string, string> = {
  REQUIRED: "Anerkennung erforderlich",
  IN_PROGRESS_OK: "Anerkennung in progress OK",
  NOT_REQUIRED: "Keine Anerkennung nötig",
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ok" | "warn" }) {
  const toneClass =
    tone === "ok"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "warn"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-muted text-foreground border-border"
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${toneClass}`}>
      {children}
    </span>
  )
}

function LockedBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border bg-muted text-muted-foreground border-dashed">
      <LockClosedIcon className="h-3 w-3" />
      {children} — upgrade to view
    </span>
  )
}

export function SignalBadges(props: Props) {
  const free: React.ReactNode[] = []
  if (props.languageLevel) free.push(<Badge key="lang">{props.languageLevel} Deutsch</Badge>)
  if (props.englishOk) free.push(<Badge key="en" tone="ok">English OK</Badge>)
  if (props.anerkennungRequired) {
    const tone = props.anerkennungRequired === "REQUIRED" ? "warn" : "ok"
    free.push(
      <Badge key="anerk" tone={tone}>{ANERKENNUNG_LABELS[props.anerkennungRequired]}</Badge>
    )
  }
  if (props.visaPathway) {
    free.push(<Badge key="visa">{VISA_LABELS[props.visaPathway] ?? props.visaPathway}</Badge>)
  }

  const premium: React.ReactNode[] = []
  if (props.anerkennungSupport != null) {
    premium.push(
      props.isPremium ? (
        <Badge key="ansup" tone="ok">Anerkennung-Unterstützung</Badge>
      ) : (
        <LockedBadge key="ansup">Anerkennung-Unterstützung</LockedBadge>
      )
    )
  }
  if (props.visaSponsorship != null) {
    premium.push(
      props.isPremium ? (
        <Badge key="vs" tone="ok">Visa-Sponsoring</Badge>
      ) : (
        <LockedBadge key="vs">Visa-Sponsoring</LockedBadge>
      )
    )
  }
  if (props.relocationSupport) {
    premium.push(
      props.isPremium ? (
        <Badge key="rs" tone="ok">Relocation: {props.relocationSupport}</Badge>
      ) : (
        <LockedBadge key="rs">Relocation-Support</LockedBadge>
      )
    )
  }

  if (free.length === 0 && premium.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {free}
      {premium}
    </div>
  )
}
```

If the project doesn't already use `@heroicons/react`, replace `LockClosedIcon` with an inline SVG or any lock icon already in the codebase — don't add a dependency for it.

- [ ] **Step 11.2: Render badges on the job detail page**

Open `app/jobs/student-jobs/job/[slug]/page.tsx`. Find the JSX section that renders the title/company header. Just under the title, render `<SignalBadges ... />` with all 7 signal fields and the user's premium status (read from auth context or server-side determined). Example placement (adjust to match the file's existing structure):

```typescript
import { SignalBadges } from "@/components/jobs-portal/SignalBadges"
// ...
<h1 className="text-2xl font-bold">{job.title}</h1>
<p className="text-muted-foreground">{job.company} · {job.location}</p>
<SignalBadges
  languageLevel={job.languageLevel}
  englishOk={job.englishOk}
  anerkennungRequired={job.anerkennungRequired}
  visaPathway={job.visaPathway}
  anerkennungSupport={job.anerkennungSupport}
  visaSponsorship={job.visaSponsorship}
  relocationSupport={job.relocationSupport}
  isPremium={isPremium}
/>
```

If this is a server component with no auth context, read the JWT cookie / token here using the existing portal-auth helper (search the file for how it currently distinguishes free vs premium content).

- [ ] **Step 11.3: Manual UI test**

`npm run dev`, visit any `/jobs/student-jobs/job/<slug>` page for a job that has signals populated. Confirm:
- Free badges render (language, english, anerkennung, visa)
- Premium-only badges show locked state for free user, unlocked for premium user
- Badges don't render if all signals are null

- [ ] **Step 11.4: Commit**

```bash
git add components/jobs-portal/SignalBadges.tsx app/jobs/student-jobs/job/[slug]/page.tsx
git commit -m "feat(jobs-portal): signal badges on job detail page with premium gating"
```

---

## Task 12: Production rollout — manual checklist

**No code changes — this task is operational.** Run after every preceding task is merged to main and Vercel auto-deploy succeeds.

- [ ] **Step 12.1: Confirm `GEMINI_API_KEY` is set in Vercel production**

```bash
vercel env ls --environment production | grep -i gemini
```
If absent, add it via the Vercel dashboard before continuing.

- [ ] **Step 12.2: Verify schema is live in Neon**

Open Vercel deployment → click "Functions" → call any route that reads JobPosting (e.g., the existing list endpoint). If it returns 200, schema migration succeeded. Or run locally:
```bash
DATABASE_URL=$(vercel env pull --environment production .env.production --yes && grep ^DATABASE_URL .env.production | cut -d= -f2-) npx prisma db pull
```
Then visually confirm the new fields exist in the pulled schema.

- [ ] **Step 12.3: Run the backfill script against production**

```bash
DATABASE_URL=<production-url-from-step-12.2> GEMINI_API_KEY=<prod-key> npx tsx scripts/backfill-signals.ts
```
Expected wall time: ~10 min for ~700 rows. Watch the log lines — if `failed` count climbs past 5% of processed, abort with Ctrl+C, investigate the error, and rerun (script is resumable).

- [ ] **Step 12.4: Trigger one cron run manually to verify rotation works**

```bash
curl -s -H "Authorization: Bearer $(vercel env pull --environment production --yes >/dev/null && grep ^CRON_SECRET .env.production | cut -d= -f2)" \
  https://planbeta.app/api/cron/job-scraper | head -c 600
```
Expected: 200 with a `keywords` array of 4 names and `nextCursor` advanced. Hit it again — cursor advances further.

- [ ] **Step 12.5: Trigger one signal-worker run manually**

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" https://planbeta.app/api/cron/signal-worker | head -c 400
```
Expected: 200 with `processed`, `succeeded`, `failed`, `exhausted` counts.

- [ ] **Step 12.6: Update Kimi Claw prompts on the external side**

Outside this codebase. In the Kimi Claw dashboard (kimi.ai), update each scrape recipe for the new specialised portals (Pflegejobs.de, Marburger-Bund, Klinik-jobs.de, etc. — full list in spec §4.1) to populate the seven new signal fields when posting to `/api/jobs/ingest`. Reference the Zod schema in `app/api/jobs/ingest/route.ts` for the exact accepted enum values.

- [ ] **Step 12.7: Spot-check the portal UX**

Visit `https://planbeta.app/jobs/student-jobs` in an incognito window. Confirm:
- "Migrant fit" filters render and filter
- "Visa & support" filters show as locked with upgrade CTA
- A few sample job detail pages show the signal badges row

- [ ] **Step 12.8: Tag the rollout in MEMORY.md**

Update `/Users/deepak/.claude/projects/-Users-deepak-plan-beta-dashboard/memory/project-migrant-aware-scraper.md` from "BRAINSTORM IN PROGRESS / SPEC WRITTEN" to "SHIPPED YYYY-MM-DD" with a one-line note on backfill outcome (X jobs signaled, Y exhausted). Also flip the MEMORY.md index entry.

---

## Self-Review Notes

After writing this plan, I checked it against the spec:

- **Spec coverage:** Every section §1–§14 maps to at least one task. §11 schema → Task 1. §6 extraction → Tasks 3, 4, 5, 7. §7 cron → Tasks 4, 6, 8. §8 backfill → Task 7. §9 failure modes → Task 4 (retry+exhaustion logic). §10 UX → Tasks 9, 10, 11. §14 rollout → Task 12.
- **Placeholder scan:** No "TBD" or "implement later" — but Task 9.3 and Task 10.3 ask the engineer to follow existing URL-state patterns rather than dictating exact code, because the sidebar parent's existing pattern wasn't readable in advance. The instructions identify the pattern to follow and the exact backend slice to add. This is acceptable but flag to reviewer.
- **Type consistency:** Enum names (`LanguageLevel`, `AnerkennungStatus`, `VisaPathway`) and their values are identical across Prisma schema (Task 1), Zod (Tasks 3, 5), and UI option lists (Tasks 9, 10, 11). Property names (`languageLevel`, `englishOk`, `anerkennungRequired`, `visaPathway`, `anerkennungSupport`, `visaSponsorship`, `relocationSupport`) match across all three layers.
- **`scrapeAllSources` retirement:** Task 6.2 notes that the cron route no longer calls `scrapeAllSources()` but advises checking for other callers before removing it. Other callers (e.g. an admin "scrape now" button) should keep working — the function isn't deleted, just unused by the cron.
