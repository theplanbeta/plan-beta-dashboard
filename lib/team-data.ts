// Plan Beta team page data.
//
// FLOW for first-time population:
//   1. `npx tsx scripts/extract-teachers.ts > .team-raw.txt`
//      — pulls active teachers from the User table and prints a ready-to-paste
//        TS array. The script is idempotent; rerun any time the team changes.
//   2. Open .team-raw.txt, drop entries you don't want, polish each bio line,
//      replace the suggested `photo` paths with the real filenames once you
//      drop the images into `public/team/`.
//   3. Paste the curated array into TEACHERS below.
//   4. Aparna stays in FOUNDER, not in TEACHERS — the page treats her
//      separately. Update her bio + photo path inline.

import { marketingWhatsAppUrl } from "@/lib/marketing-constants"

export type GermanLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
export type TeacherLocation = "Germany" | "India"

export interface Teacher {
  /** First + last name. Public-facing. */
  name: string
  /** Path under /public — e.g. `/team/aparna.jpg`. 1:1 portrait, ≥800×800.
   *  Optional: omit (or undefined) for an initials-avatar fallback. */
  photo?: string
  /** Levels they teach. Sorted automatically when rendered. */
  levels: GermanLevel[]
  /** Where the teacher is currently based — drives the "Based in …" tag on
   *  their card. Update if/when they relocate. */
  location: TeacherLocation
  /** Optional city for fuller location detail (e.g. "Stuttgart"). Render
   *  shows "Based in {city}, {location}" when set, else "Based in {location}". */
  city?: string
  /** Optional CSS `object-position` for the portrait crop. Defaults to
   *  `center`. Use `"top"` when the subject's head is high in the frame and
   *  centre-cropping clips the forehead. */
  objectPosition?: string
}

export interface Founder extends Teacher {
  role: string
  /** Editorial bio for the founder spotlight (only Aparna has one). */
  bio: string
  whatsappUrl: string
}

// --- Aparna: founder & director ---
// Edit bio + photo path. The WhatsApp message is pre-filled for the page CTA.
export const FOUNDER: Founder = {
  name: "Aparna Bose",
  role: "Founder & Director",
  photo: "/team/aparna.jpg",
  levels: ["A1", "A2", "B1", "B2"],
  location: "Germany",
  city: "Stuttgart",
  bio: "Aparna founded Plan Beta to build a German school that runs on standards, not shortcuts: small live batches, B2-trained teachers, and the same care for a beginner's first A1 hour as for a nurse's final B2 exam. She still teaches every level she ships.",
  whatsappUrl: marketingWhatsAppUrl(
    "Hi Aparna! I'd like to learn more about Plan Beta."
  ),
}

// --- Teachers (everyone else, no hierarchy) ---
// Curated from scripts/extract-teachers.ts output on 2026-05-13.
// Order doesn't matter — the page shuffles them deterministically each day.
// Anu + Deepana are based in Germany; everyone else is in India.
export const TEACHERS: Teacher[] = [
  {
    name: "Anu",
    photo: "/team/anu.jpg",
    levels: ["A1", "A2"],
    location: "Germany",
  },
  {
    name: "Chinnu",
    photo: "/team/chinnu.jpg",
    levels: ["A1", "A2", "B1"],
    location: "India",
  },
  {
    name: "Christeen",
    photo: "/team/christeen.jpg",
    levels: ["A1"],
    location: "India",
  },
  {
    name: "Deepana Shiny George",
    photo: "/team/deepana-shiny-george.jpg",
    levels: ["A1", "A2"],
    location: "Germany",
  },
  {
    name: "Madhumitha",
    photo: "/team/madhumitha.jpg",
    levels: ["A2", "B1", "B2"],
    location: "India",
  },
  {
    name: "Nitha",
    photo: "/team/nitha.jpg",
    levels: ["A1", "A2", "B1"],
    location: "India",
    objectPosition: "top",
  },
  {
    name: "Swathi",
    photo: "/team/swathi.jpg",
    levels: ["A2", "B1"],
    location: "India",
  },
  {
    name: "Varsha",
    // No photo on file — page falls back to initials avatar.
    levels: ["A1", "A2", "B1", "B2"],
    location: "India",
  },
]

// --- Helpers consumed by the page ---

const LEVEL_ORDER: GermanLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"]

/** Renders "Teaches A1–B2" when levels form a contiguous range, otherwise
 * "Teaches A1, B1, C1". Empty array returns empty string. */
export function formatLevels(levels: GermanLevel[]): string {
  if (levels.length === 0) return ""
  const sorted = [...levels].sort(
    (a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b)
  )
  if (sorted.length === 1) return `Teaches ${sorted[0]}`
  const firstIdx = LEVEL_ORDER.indexOf(sorted[0])
  const lastIdx = LEVEL_ORDER.indexOf(sorted[sorted.length - 1])
  const isContiguous = lastIdx - firstIdx + 1 === sorted.length
  return isContiguous
    ? `Teaches ${sorted[0]}–${sorted[sorted.length - 1]}`
    : `Teaches ${sorted.join(", ")}`
}

/** Deterministic shuffle keyed to today's UTC date. Same order all day for a
 * given input → ISR-cache friendly + Googlebot sees stable content. New order
 * the next day, which reinforces the anti-hierarchy stance. */
export function dailyShuffle<T>(items: T[]): T[] {
  if (items.length <= 1) return items.slice()
  const today = new Date()
  const seedStr = `${today.getUTCFullYear()}-${today.getUTCMonth()}-${today.getUTCDate()}`
  let seed = 0
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0
  }
  // Mulberry32 — fast, deterministic.
  const rng = () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
