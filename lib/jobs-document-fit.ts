type ProfileForDocumentFit = {
  profession?: string | null
  currentJobTitle?: string | null
  germanLevel?: string | null
  skills?: unknown
  workExperience?: unknown
  education?: unknown
  certifications?: unknown
}

type JobForDocumentFit = {
  title: string
  profession?: string | null
  description?: string | null
  requirements?: string[]
  germanLevel?: string | null
}

type DocumentFitResult = {
  canGenerate: boolean
  reason?: string
}

const CARE_ROLE_TERMS = [
  "pflege",
  "pflegedienst",
  "pflegedienstleitung",
  "altenpflege",
  "krankenpflege",
  "pflegefach",
  "pflegekraft",
  "nursing",
  "nurse",
  "healthcare",
]

const CARE_EVIDENCE_TERMS = [
  ...CARE_ROLE_TERMS,
  "medizin",
  "medical",
  "clinical",
  "clinic",
  "hospital",
  "patient",
  "gesundheit",
]

const GERMAN_LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"] as const

function flattenText(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (Array.isArray(value)) return value.map(flattenText).join(" ")
  if (typeof value === "object") return Object.values(value).map(flattenText).join(" ")
  return ""
}

function includesAny(haystack: string, terms: string[]) {
  const normalized = haystack.toLowerCase()
  return terms.some((term) => normalized.includes(term))
}

function isBelowGermanLevel(candidate: string | null | undefined, required: string) {
  if (!candidate) return true
  const candidateIndex = GERMAN_LEVEL_ORDER.indexOf(candidate.toUpperCase() as (typeof GERMAN_LEVEL_ORDER)[number])
  const requiredIndex = GERMAN_LEVEL_ORDER.indexOf(required as (typeof GERMAN_LEVEL_ORDER)[number])
  if (candidateIndex === -1 || requiredIndex === -1) return false
  return candidateIndex < requiredIndex
}

export function assessGeneratedDocumentFit(
  profile: ProfileForDocumentFit,
  job: JobForDocumentFit
): DocumentFitResult {
  const jobText = [
    job.title,
    job.profession,
    job.description,
    ...(job.requirements || []),
  ].join(" ")

  const profileText = [
    profile.profession,
    profile.currentJobTitle,
    flattenText(profile.skills),
    flattenText(profile.workExperience),
    flattenText(profile.education),
    flattenText(profile.certifications),
  ].join(" ")

  const careRole = includesAny(jobText, CARE_ROLE_TERMS)
  const careEvidence = includesAny(profileText, CARE_EVIDENCE_TERMS)

  if (careRole && !careEvidence) {
    return {
      canGenerate: false,
      reason:
        "This appears to be a regulated nursing/care role, but your profile does not show nursing, care, clinical, or healthcare experience. Generating a tailored CV here would risk creating misleading application documents.",
    }
  }

  const seniorCareLeadership =
    /\b(pflegedienstleitung|stellvertretende pflegedienstleitung|leitung pflege|head nurse|nursing manager)\b/i.test(jobText)
  if (seniorCareLeadership && isBelowGermanLevel(profile.germanLevel, "B2")) {
    return {
      canGenerate: false,
      reason:
        "This care-leadership role appears to require strong German. Your profile is below B2, so Day Zero should not generate a leadership application package for it yet.",
    }
  }

  return { canGenerate: true }
}
