# CV / Anschreiben Generation — Adversarial Review & Fix Plan

**Date:** 2026-04-30
**Status:** Plan saved, implementation paused
**Context for next session:** Pick up at "Tier A" below

## Background

After deploying the HTML → headless-Chromium pipeline (commits `0b6048b` → `7cfa9dc` → `412f833`) and getting CV/Anschreiben generation working end-to-end on Vercel, the user generated a real test CV for an "Assistenzarzt Anästhesie (m/w/d)" position at Hays Professional Solutions GmbH (Standort Dresden). Two PDFs:

- `assistenzarzt-an-sthesie-...1777378094239.pdf` — CV (Lebenslauf, German)
- `assistenzarzt-an-sthesie-...1777378112308.pdf` — Anschreiben (Cover letter, German)

Three adversarial agents reviewed the output independently:

1. **German linguist + business-etiquette reviewer** — grammar, idiomatic phrasing, formality
2. **German clinic HR recruiter** — would-this-be-invited-to-interview filter
3. **ATS / structural / fabrication auditor** — pipeline integrity, Claude prompt failures

All three converged: **this would be skipped in <30 seconds, and the Approbation claim is potentially fraudulent.**

## Critical defects (generation pipeline must prevent)

| # | Defect | Where it leaks | Severity |
|---|---|---|---|
| 1 | `"Klinikum (Name nicht spezifiziert)"` rendered as employer | AI prompt accepted missing employer; should have refused | Auto-reject |
| 2 | `"Approbation als Arzt — 2018"` invented | AI fabricated a German government-issued credential year. **Legally risky.** A foreign-trained doctor with B2 German cannot legally hold Approbation in Germany — Approbation requires Fachsprachprüfung (C1 medical German) + Kenntnisprüfung. The AI invented a verifiable Landesbehörde-issued document and date. | Possibly fraudulent |
| 3 | Email duplicated in Anschreiben sender block | `lib/anschreiben-html-template.ts` renders email line(s) plus the AI's `senderBlock` — when the AI includes email in its block, it appears twice | Sloppy → skip |
| 4 | Recipient block contradiction: `"Standort Dresden ... Magdeburg"` | Pipeline passed both `job.company` ("Hays Professional Solutions GmbH Standort Dresden") and `job.location` ("Magdeburg") to the AI. AI rendered both into recipient block | Skip-trigger |
| 5 | `"über 500 Anästhesieverfahren"` + `"100% Sicherheitsstandard"` invented | Numerical claims with no source data. AI prompt's "NEVER fabricate" rule was not enforced for numbers/percentages | AI tell |
| 6 | Subject keeps `(m/w/d)` | Job title pulled verbatim into subject. The `(m/w/d)` suffix is gender-neutral hiring language for the LISTING — candidates writing the subject should drop it | Convention error |

## Language defects

| # | Defect | Quote | Fix |
|---|---|---|---|
| L1 | `"01/2018 – Present"` in German document | CV work experience date | Render `heute` when language=de |
| L2 | Subjekt-Verb-Kongruenz error: "zeichnet" should be "zeichnen" (two subjects) | "Dabei zeichnet mich meine strukturierte Arbeitsweise und meine Fähigkeit aus" | Prompt nudge |
| L3 | `welches` is gestelzt-altmodisch | "welches ich nun gezielt... vertiefen möchte" | Prompt nudge: prefer `das` |
| L4 | Egoistisch framing — wants to say what candidate brings, not what they get | "vom professionellen Netzwerk der Hays-Gruppe zu profitieren" | Prompt nudge: paragraph 3 reframe |
| L5 | Buzzword bingo signalling AI generation | "umfassende Erfahrungen sammeln" + "solides Fundament" + "kontinuierlich ausbauen" + "besonnen und präzise" | Anti-cliché prompt rules |
| L6 | Closing on single line with mittelpunkt instead of proper letter format | "Mit freundlichen Grüßen · Deepak Bos" | HTML template: separate lines + signature space |
| L7 | Missing `Anlagen:` line | (absent) | HTML template addition |
| L8 | "starker Kommunikationsfähigkeit" — direct calque of "strong" | profile section | Prompt nudge: prefer `ausgeprägter` / `fundierter` |
| L9 | "Bewährte Fähigkeiten" — calque of "proven skills" | competencies | Prompt: prefer `nachgewiesene Kenntnisse` |
| L10 | "Kompetent in..." — angeberisch as self-description | profile/bullets | Prompt: prefer factual `Erfahrung in der ...` |

## Implementation plan

### Tier A — pipeline gates (~45 min)

Removes the two worst defects (placeholder employer + fabricated Approbation).

**File: `lib/jobs-ai.ts`** — strengthen prompt:

```
ABSOLUTE RULES (additions):
- NEVER add a credential, license, registration, or government-issued
  document to the output that is not present in the source profile.
  This includes Approbation, Berufserlaubnis, Anerkennungsbescheid,
  Fachsprachprüfung, board certifications, and similar regulated items.
- NEVER invent numerical claims (procedure counts, patient counts,
  percentages, durations) not present in source.
- Bullet count for any work-experience entry MUST be ≤ source bullet
  count for that entry. Do not invent bullets to fill space.
- If `workExperience[].company` is missing or matches a placeholder
  pattern (e.g. "Medical Institution", "Klinikum (Name nicht
  spezifiziert)", "Hospital", "Klinik"), return the JSON
  `{"__INSUFFICIENT_DATA__": "missing employer"}` instead of generating.
- Same for `education[].institution` ("Medical University",
  "Medizinische Universität", "University").
```

**File: `app/api/jobs-app/cv/generate/route.ts`** and `anschreiben/generate/route.ts` — add pre-flight gate:

```ts
// Reject before calling Claude if profile is too sparse to generate
// honestly. Return 422 with a structured error so the UI can prompt
// the user to complete their profile.
function validateProfileForGeneration(profile: JobSeekerProfile): {
  ok: boolean; missing: string[]
} {
  const missing: string[] = []
  const hasRealCompany = (profile.workExperience as Array<{company?: string}>)
    ?.some(w => w.company && !PLACEHOLDER_COMPANY_RE.test(w.company))
  if (!hasRealCompany) missing.push("real employer name")

  const hasRealEducation = (profile.educationDetails as Array<{institution?: string}>)
    ?.some(e => e.institution && !PLACEHOLDER_INSTITUTION_RE.test(e.institution))
  if (!hasRealEducation) missing.push("educational institution")

  if (!profile.firstName || !profile.lastName) missing.push("full name")
  return { ok: missing.length === 0, missing }
}

const PLACEHOLDER_COMPANY_RE = /^(klinikum|medical institution|hospital|klinik)\s*(\(.*\))?$/i
const PLACEHOLDER_INSTITUTION_RE = /^(medical university|medizinische universität|university|hochschule)$/i
```

UI: if 422 with `{ error: "profile_incomplete", missing: [...] }`, show toast linking to `/jobs-app/onboarding` with the missing fields highlighted.

**Subject sanitizer** — strip `(m/w/d)`, `(w/m/d)`, `(d/m/w)`, `(m/f/d)` regex from job title before passing to AI for both CV and Anschreiben generation.

### Tier B — template & prompt cleanups (~30 min)

**File: `lib/anschreiben-html-template.ts`**:
- Dedupe email rendering: only render email line if it's NOT already present in `content.senderBlock` (case-insensitive substring check)
- Recipient block: ignore `job.location` entirely; use only what's parsed out of `job.company` (or pass parsed-once recipient to AI to avoid conflation)
- Closing block: separate lines for "Mit freundlichen Grüßen" → blank line × 2-3 (signature space) → name. Add "Anlagen: Lebenslauf, Approbationsbescheid, Zeugnisse" line if applicable

**File: `lib/cv-html-template.ts`**:
- Date renderer: when `language === "de"`, replace `"Present"` / `"present"` → `"heute"`
- Same for end-date strings throughout

### Tier C — prompt strengthening (~30 min)

**File: `lib/jobs-ai.ts`** generateCVContent + generateAnschreiben prompts:

Add German style nudges to system prompt for `language === "de"`:

```
GERMAN STYLE GUIDE (when output language is "de"):
- Avoid these clichés (sound like AI/template): "umfassende
  Erfahrungen sammeln", "solides Fundament", "kontinuierlich
  ausbauen", "besonnen und präzise", "kompetent in...", "100%
  Sicherheitsstandard", "bewährte Fähigkeiten"
- Prefer "das" over "welches" except in formal-restrictive clauses
- Prefer "ausgeprägt" / "fundiert" over "stark" for descriptions
- Prefer "Erfahrung in der ..." over "kompetent in der ..."
  (factual vs angeberisch)
- Subjekt-Verb-Kongruenz: two subjects joined by "und" take plural verb
- Anschreiben paragraph 3 (motivation): emphasize what candidate
  BRINGS to the employer, not what candidate gets from them.
  "Ich profitiere von..." reframes are common AI error.
```

## Critical files

- `lib/jobs-ai.ts` — system prompts for generateCVContent + generateAnschreiben
- `app/api/jobs-app/cv/generate/route.ts` — add pre-flight gate
- `app/api/jobs-app/anschreiben/generate/route.ts` — add pre-flight gate
- `lib/cv-html-template.ts` — `Present` → `heute` localisation
- `lib/anschreiben-html-template.ts` — dedupe email; recipient single-source; closing format; Anlagen line
- `components/jobs-app/ApplicationKitModal.tsx` — handle 422 `profile_incomplete` with profile-completion CTA toast

## Verification

After implementing each tier:

1. **Tier A**: with the test seeker (placeholder profile data), CV generation should now return 422 with `missing: ["real employer name", "educational institution"]`. Toast prompts user to complete profile.
2. **Tier B**: regenerate Anschreiben — sender block has email exactly once; recipient block has only one location; closing block has proper line breaks + signature space.
3. **Tier C**: regenerate CV with a populated profile — output uses `heute` instead of `Present`, no banned clichés, paragraph 3 reframes to value-to-employer.

End-to-end: a German native reviewer should not be able to identify the output as AI-generated within 30 seconds. The Approbation claim should never appear unless source data contains it.

## Out of scope (separate follow-ups)

- Adding Bewerbungsfoto support (German clinical CVs traditionally include one)
- Adding persönliche Daten section (Geburtsdatum, Staatsangehörigkeit, Anschrift) — depends on parsed profile having these fields
- Anerkennungsverfahren / Berufserlaubnis status field — requires schema additions to JobSeekerProfile
- Fortbildungen / Hospitationen sections — currently no source field for these
- ATS post-generation diff check (any token not in source → human review flag)

## How to resume

Open this file. Start with **Tier A** — the placeholder gate alone prevents the worst outputs. Each tier ships independently.

Latest deploy at time of save: `412f833 fix(jobs-app): store Anschreiben as private + route through auth proxy`. Test test-coupon code: `DZ-LKAQ8K` (365 days Pro, 5 uses). Login as the QA mentee or your own account and trigger CV gen on the same Hays Assistenzarzt Anästhesie posting to verify each tier's effect.
