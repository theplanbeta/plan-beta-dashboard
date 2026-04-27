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
