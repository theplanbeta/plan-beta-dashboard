// lib/profile-merge.ts
import type { ParsedCV } from "./cv-parser"

// Single source of truth for the scalar keys of ParsedCV. Consumed by
// smartMerge and by the profile PATCH route's manuallyEditedFields diff
// logic. Adding a scalar to ParsedCV and forgetting to update this list
// breaks manual-edit protection silently — the drift-coverage test in
// profile-merge.test.ts is the canary.
export const PARSED_CV_SCALAR_KEYS = [
  "firstName",
  "lastName",
  "currentJobTitle",
  "yearsOfExperience",
] as const

export type ParsedCVScalarKey = (typeof PARSED_CV_SCALAR_KEYS)[number]

export interface ExistingProfile {
  firstName: string | null
  lastName: string | null
  currentJobTitle: string | null
  yearsOfExperience: number | null
  workExperience: Array<{ id: string; company: string; title: string; from: string | null; to: string | null; description: string | null }>
  skills: { technical: string[]; languages: string[]; soft: string[] } | null
  educationDetails: Array<{ id: string; institution: string; degree: string | null; field: string | null; year: string | null }>
  certifications: Array<{ id: string; name: string; issuer: string | null; year: string | null }>
  manuallyEditedFields: Record<string, true> | null
}

export interface MergeDiff {
  workExperience: { added: ExistingProfile["workExperience"]; matched: ExistingProfile["workExperience"] }
  skills: { addedTechnical: string[]; addedLanguages: string[]; addedSoft: string[] }
  educationDetails: { added: ExistingProfile["educationDetails"]; matched: ExistingProfile["educationDetails"] }
  certifications: { added: ExistingProfile["certifications"]; matched: ExistingProfile["certifications"] }
  scalarChanges: Record<string, { before: unknown; after: unknown }>
  preservedFromManualEdits: string[]
}

export interface MergeResult {
  merged: ExistingProfile
  diff: MergeDiff
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").replace(/[^\p{L}\p{N} ]/gu, "").trim()

// Normalize arbitrary date-like strings to YYYY or YYYY-MM for matching.
// Accepts "2020", "2020-03", "03/2020", "March 2020", "Mar 2020".
// Falls through to a lowercased trim for anything else so exact-match still works.
function normDate(s: string | null | undefined): string {
  if (!s) return ""
  const t = s.trim().toLowerCase()
  if (!t) return ""
  const mIso = /^(\d{4})(?:-(\d{1,2}))?$/.exec(t)
  if (mIso) return mIso[2] ? `${mIso[1]}-${mIso[2].padStart(2, "0")}` : mIso[1]
  const mSlash = /^(\d{1,2})\/(\d{4})$/.exec(t)
  if (mSlash) return `${mSlash[2]}-${mSlash[1].padStart(2, "0")}`
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    january: "01", february: "02", march: "03", april: "04", june: "06",
    july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
  }
  const mName = /^([a-z]+)[\s-]+(\d{4})$/.exec(t)
  if (mName && months[mName[1]]) return `${mName[2]}-${months[mName[1]]}`
  return t
}

function matchWork(
  a: { company: string; title: string; from: string | null },
  b: { company: string; title: string; from: string | null }
): boolean {
  return (
    norm(a.company) === norm(b.company) &&
    norm(a.title) === norm(b.title) &&
    normDate(a.from) === normDate(b.from)
  )
}

function matchEdu(
  a: { institution: string; degree: string | null; field: string | null },
  b: { institution: string; degree: string | null; field: string | null }
): boolean {
  return (
    norm(a.institution) === norm(b.institution) &&
    norm(a.degree ?? "") === norm(b.degree ?? "") &&
    norm(a.field ?? "") === norm(b.field ?? "")
  )
}

function matchCert(
  a: { name: string; issuer: string | null },
  b: { name: string; issuer: string | null }
): boolean {
  return norm(a.name) === norm(b.name) && norm(a.issuer ?? "") === norm(b.issuer ?? "")
}

function unionCI(existing: string[], incoming: string[]): string[] {
  const keyFn = (s: string) => s.trim().toLowerCase()
  const seen = new Set(existing.map(keyFn))
  const added: string[] = []
  for (const s of incoming) {
    const k = keyFn(s)
    if (!k) continue
    if (!seen.has(k)) {
      seen.add(k)
      added.push(s.trim())
    }
  }
  return [...existing, ...added]
}

export function smartMerge(existing: ExistingProfile, parsed: ParsedCV): MergeResult {
  const edited = existing.manuallyEditedFields ?? {}
  const diff: MergeDiff = {
    workExperience: { added: [], matched: [] },
    skills: { addedTechnical: [], addedLanguages: [], addedSoft: [] },
    educationDetails: { added: [], matched: [] },
    certifications: { added: [], matched: [] },
    scalarChanges: {},
    preservedFromManualEdits: [],
  }

  // Scalars — PARSED_CV_SCALAR_KEYS is the shared source of truth
  const merged: ExistingProfile = { ...existing }
  for (const key of PARSED_CV_SCALAR_KEYS) {
    const path = `profile.${key}`
    if (edited[path]) {
      diff.preservedFromManualEdits.push(path)
      continue
    }
    const incoming = parsed[key]
    if (incoming !== null && incoming !== existing[key]) {
      diff.scalarChanges[key] = { before: existing[key], after: incoming }
      // TypeScript forgives the narrowing here — same union types
      ;(merged as unknown as Record<string, unknown>)[key] = incoming
    }
  }

  // workExperience — match, append unmatched
  const newWork: ExistingProfile["workExperience"] = [...existing.workExperience]
  for (const p of parsed.workExperience) {
    const matched = existing.workExperience.find((e) => matchWork(e, p))
    if (matched) {
      diff.workExperience.matched.push(matched)
    } else {
      const entry = {
        id: p.id ?? crypto.randomUUID(),
        company: p.company,
        title: p.title,
        from: p.from,
        to: p.to,
        description: p.description,
      }
      newWork.push(entry)
      diff.workExperience.added.push(entry)
    }
  }
  merged.workExperience = newWork

  // skills — skip entirely if profile.skills is manually edited
  if (edited["profile.skills"]) {
    diff.preservedFromManualEdits.push("profile.skills")
  } else {
    const existingSkills = existing.skills ?? { technical: [], languages: [], soft: [] }
    const technicalMerged = unionCI(existingSkills.technical, parsed.skills.technical)
    const languagesMerged = unionCI(existingSkills.languages, parsed.skills.languages)
    const softMerged = unionCI(existingSkills.soft, parsed.skills.soft)
    diff.skills.addedTechnical = technicalMerged.slice(existingSkills.technical.length)
    diff.skills.addedLanguages = languagesMerged.slice(existingSkills.languages.length)
    diff.skills.addedSoft = softMerged.slice(existingSkills.soft.length)
    merged.skills = { technical: technicalMerged, languages: languagesMerged, soft: softMerged }
  }

  // educationDetails
  const newEdu: ExistingProfile["educationDetails"] = [...existing.educationDetails]
  for (const p of parsed.educationDetails) {
    const matched = existing.educationDetails.find((e) => matchEdu(e, p))
    if (matched) {
      diff.educationDetails.matched.push(matched)
    } else {
      const entry = { id: p.id ?? crypto.randomUUID(), institution: p.institution, degree: p.degree, field: p.field, year: p.year }
      newEdu.push(entry)
      diff.educationDetails.added.push(entry)
    }
  }
  merged.educationDetails = newEdu

  // certifications
  const newCert: ExistingProfile["certifications"] = [...existing.certifications]
  for (const p of parsed.certifications) {
    const matched = existing.certifications.find((e) => matchCert(e, p))
    if (matched) {
      diff.certifications.matched.push(matched)
    } else {
      const entry = { id: p.id ?? crypto.randomUUID(), name: p.name, issuer: p.issuer, year: p.year }
      newCert.push(entry)
      diff.certifications.added.push(entry)
    }
  }
  merged.certifications = newCert

  return { merged, diff }
}
