import Link from "next/link"
import { MapPin, Briefcase, Euro } from "lucide-react"
import MatchBadge from "./MatchBadge"
import type { MatchLabel } from "@/lib/heuristic-scorer"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JobData {
  id?: string
  slug?: string | null
  title: string
  company: string
  location?: string | null
  salaryMin?: number | null
  salaryMax?: number | null
  currency?: string | null
  germanLevel?: string | null
  jobType?: string | null
  matchScore?: number | null
  matchLabel?: MatchLabel | null
  createdAt?: Date | string
}

// ---------------------------------------------------------------------------
// Job type label map
// ---------------------------------------------------------------------------

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  WORKING_STUDENT: "Working Student",
  INTERNSHIP: "Internship",
  CONTRACT: "Contract",
}

// ---------------------------------------------------------------------------
// Salary formatter
// ---------------------------------------------------------------------------

function formatSalary(
  min: number | null | undefined,
  max: number | null | undefined
): string | null {
  if (!min && !max) return null
  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n)
  if (min && max) return `${fmt(min)}–${fmt(max)}`
  if (max) return `up to ${fmt(max)}`
  return `from ${fmt(min!)}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function JobCard({
  slug,
  title,
  company,
  location,
  salaryMin,
  salaryMax,
  currency,
  germanLevel,
  jobType,
  matchScore,
  matchLabel,
}: JobData) {
  const href = slug ? `/jobs-app/job/${slug}` : "#"
  const salaryLabel = formatSalary(salaryMin, salaryMax)
  const jobTypeLabel = jobType ? (JOB_TYPE_LABELS[jobType] ?? jobType) : null

  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
    >
      {/* Match badge — top-right */}
      {matchScore != null && matchLabel ? (
        <div className="absolute right-4 top-4">
          <MatchBadge
            score={matchScore}
            label={matchLabel.label}
            color={matchLabel.color}
            bgColor={matchLabel.bgColor}
            size="sm"
          />
        </div>
      ) : null}

      {/* Title + company */}
      <div className="pr-24">
        <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-blue-600">
          {title}
        </h3>
        <p className="mt-0.5 truncate text-sm text-gray-500">{company}</p>
      </div>

      {/* Metadata pills */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
        {location ? (
          <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            {location}
          </span>
        ) : null}

        {jobTypeLabel ? (
          <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5">
            <Briefcase className="h-3 w-3 shrink-0" />
            {jobTypeLabel}
          </span>
        ) : null}

        {salaryLabel ? (
          <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5">
            <Euro className="h-3 w-3 shrink-0" />
            {salaryLabel}
            {currency && currency !== "EUR" ? ` ${currency}` : ""}
          </span>
        ) : null}

        {germanLevel ? (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5">{germanLevel}</span>
        ) : null}
      </div>
    </Link>
  )
}

export default JobCard
