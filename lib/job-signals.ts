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

/**
 * Stable cache key for signal extraction.
 *
 * Hashes the same fields the prompt actually uses (title + description +
 * requirements) so any input change invalidates the cache. Callers pass this
 * alongside extracted signals; on re-scrape, an unchanged hash means we can
 * skip the Gemini call.
 */
export function computeSignalsHash(
  title: string,
  description: string | null,
  requirements: string[]
): string {
  const payload = `${title}\n${description ?? ""}\n${requirements.join("\n")}`
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

  const res = await generateContent(
    `${SYSTEM_PROMPT}\n\n---\n\n${userPrompt}`,
    "gemini-2.5-flash-lite",
    { temperature: 0 }
  )
  if (!res.success || !res.content) {
    return { error: (res.error || "Gemini returned no content").slice(0, 500) }
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
    return {
      error: `failed to parse Gemini JSON: ${(e as Error).message}`.slice(0, 500),
    }
  }

  const parsed = JobSignalsSchema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.code}`)
      .join("; ")
    return { error: `schema validation failed: ${issues}`.slice(0, 500) }
  }

  return { signals: parsed.data }
}
