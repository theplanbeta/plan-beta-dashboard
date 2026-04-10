// Heuristic job scoring engine — zero AI cost, pure weighted field comparisons

export interface ScorerProfile {
  germanLevel: string | null
  profession: string | null
  targetLocations: string[]
  salaryMin: number | null
  salaryMax: number | null
  visaStatus: string | null
  yearsOfExperience: number | null
}

export interface ScorerJob {
  germanLevel: string | null
  profession: string | null
  location: string | null
  jobType: string | null
  salaryMin: number | null
  salaryMax: number | null
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GERMAN_LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"]

const GERMAN_REGIONS: Record<string, string[]> = {
  north: ["hamburg", "bremen", "hannover", "kiel"],
  south: ["munich", "stuttgart", "nuremberg", "augsburg"],
  west: ["cologne", "düsseldorf", "dortmund", "essen", "bonn", "frankfurt"],
  east: ["berlin", "leipzig", "dresden"],
}

// Related profession groups — any two members score 60 on partial match
const PROFESSION_GROUPS: string[][] = [
  ["nursing", "healthcare", "nurse", "medical", "hospital", "care"],
  ["it", "engineering", "software", "developer", "tech", "computer"],
  ["finance", "accounting", "banking", "audit"],
  ["education", "teaching", "training", "tutor"],
  ["logistics", "supply chain", "warehouse", "transport"],
]

// ─── Dimension scorers ────────────────────────────────────────────────────────

function scoreGermanLevel(profile: ScorerProfile, job: ScorerJob): number {
  const jobLevel = job.germanLevel?.trim().toUpperCase()

  // Job has no requirement or explicitly "None" → open to all
  if (!jobLevel || jobLevel === "NONE") return 100

  const userLevel = profile.germanLevel?.trim().toUpperCase()

  // User hasn't specified their level
  if (!userLevel) return 20

  const jobIdx = GERMAN_LEVEL_ORDER.indexOf(jobLevel)
  const userIdx = GERMAN_LEVEL_ORDER.indexOf(userLevel)

  if (jobIdx === -1) return 50 // Unknown job level — neutral
  if (userIdx === -1) return 20 // Unknown user level — pessimistic

  const gap = jobIdx - userIdx // positive = user is below requirement

  if (gap <= 0) return 100 // User meets or exceeds
  if (gap === 1) return 60  // One level below
  return 20                  // Two or more levels below
}

function normalizeProfession(value: string): string {
  return value.toLowerCase().trim()
}

function getProfessionGroup(value: string): number {
  const normalized = normalizeProfession(value)
  return PROFESSION_GROUPS.findIndex((group) =>
    group.some((keyword) => normalized.includes(keyword))
  )
}

function scoreProfession(profile: ScorerProfile, job: ScorerJob): number {
  if (!profile.profession && !job.profession) return 50
  if (!profile.profession || !job.profession) return 50

  const profileNorm = normalizeProfession(profile.profession)
  const jobNorm = normalizeProfession(job.profession)

  if (profileNorm === jobNorm) return 100

  const profileGroup = getProfessionGroup(profile.profession)
  const jobGroup = getProfessionGroup(job.profession)

  if (profileGroup !== -1 && profileGroup === jobGroup) return 60

  return 20
}

function getRegion(city: string): string | null {
  const normalized = city.toLowerCase().trim()
  for (const [region, cities] of Object.entries(GERMAN_REGIONS)) {
    if (cities.some((c) => normalized.includes(c) || c.includes(normalized))) {
      return region
    }
  }
  return null
}

function scoreLocation(profile: ScorerProfile, job: ScorerJob): number {
  if (!job.location) return 50
  if (!profile.targetLocations || profile.targetLocations.length === 0) return 50

  const jobLocationLower = job.location.toLowerCase()

  for (const target of profile.targetLocations) {
    const targetLower = target.toLowerCase().trim()

    // Direct city match
    if (jobLocationLower.includes(targetLower) || targetLower.includes(jobLocationLower)) {
      return 100
    }
  }

  // Same German region match
  const jobRegion = getRegion(job.location)
  if (jobRegion) {
    for (const target of profile.targetLocations) {
      const targetRegion = getRegion(target)
      if (targetRegion && targetRegion === jobRegion) {
        return 70
      }
    }
  }

  return 30
}

function scoreJobType(job: ScorerJob): number {
  // We don't capture jobType preference in the quick-start profile
  return job.jobType ? 70 : 50
}

function scoreSalary(profile: ScorerProfile, job: ScorerJob): number {
  const hasJobSalary = job.salaryMin !== null || job.salaryMax !== null
  const hasProfileExpectation = profile.salaryMin !== null

  if (!hasJobSalary || !hasProfileExpectation) return 50

  // Use job's midpoint if both bounds available, otherwise use available value
  const jobMidpoint =
    job.salaryMin !== null && job.salaryMax !== null
      ? (job.salaryMin + job.salaryMax) / 2
      : (job.salaryMin ?? job.salaryMax)!

  const expectation = profile.salaryMin!

  if (jobMidpoint >= expectation) return 100

  const shortfall = (expectation - jobMidpoint) / expectation

  if (shortfall <= 0.2) return 60 // Within 20%

  return 30
}

function scoreVisa(profile: ScorerProfile, job: ScorerJob): number {
  if (!profile.visaStatus) return 50

  const visa = profile.visaStatus.toUpperCase()
  const jobType = job.jobType?.toUpperCase() ?? null

  if (visa === "BLUE_CARD") {
    if (jobType === "FULL_TIME") return 100
    if (jobType === "PART_TIME" || jobType === "INTERNSHIP") return 40
    if (!jobType) return 70 // Unknown type — moderate optimism
    return 60
  }

  if (visa === "STUDENT") {
    if (
      jobType === "WORKING_STUDENT" ||
      jobType === "PART_TIME" ||
      jobType === "INTERNSHIP"
    )
      return 100
    if (jobType === "FULL_TIME") return 20
    if (!jobType) return 60
    return 50
  }

  // Other visa statuses — neutral
  return 50
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Compute a 0–100 heuristic match score for a profile against a job posting.
 * Weights: germanLevel(0.25) + profession(0.20) + location(0.20) +
 *          jobType(0.15) + salary(0.10) + visa(0.10) = 1.00
 */
export function computeHeuristicScore(
  profile: ScorerProfile,
  job: ScorerJob
): number {
  const germanScore = scoreGermanLevel(profile, job)
  const professionScore = scoreProfession(profile, job)
  const locationScore = scoreLocation(profile, job)
  const jobTypeScore = scoreJobType(job)
  const salaryScore = scoreSalary(profile, job)
  const visaScore = scoreVisa(profile, job)

  const weighted =
    germanScore * 0.25 +
    professionScore * 0.20 +
    locationScore * 0.20 +
    jobTypeScore * 0.15 +
    salaryScore * 0.10 +
    visaScore * 0.10

  return Math.round(weighted)
}

export interface MatchLabel {
  label: string
  color: string
  bgColor: string
}

/**
 * Convert a numeric score into a human-readable match label with Tailwind color classes.
 */
export function getMatchLabel(score: number): MatchLabel {
  if (score >= 90) {
    return { label: "Excellent Match", color: "text-emerald-700", bgColor: "bg-emerald-50" }
  }
  if (score >= 75) {
    return { label: "Strong Match", color: "text-blue-700", bgColor: "bg-blue-50" }
  }
  if (score >= 60) {
    return { label: "Good Fit", color: "text-yellow-700", bgColor: "bg-yellow-50" }
  }
  if (score >= 40) {
    return { label: "Partial Match", color: "text-orange-700", bgColor: "bg-orange-50" }
  }
  return { label: "Low Match", color: "text-gray-500", bgColor: "bg-gray-50" }
}
