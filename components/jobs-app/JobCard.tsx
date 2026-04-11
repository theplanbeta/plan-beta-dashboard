import Link from "next/link"
import { MapPin, Euro, Languages } from "lucide-react"
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

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Vollzeit",
  PART_TIME: "Teilzeit",
  WORKING_STUDENT: "Werkstudent",
  INTERNSHIP: "Praktikum",
  CONTRACT: "Vertrag",
}

function formatSalary(
  min: number | null | undefined,
  max: number | null | undefined
): string | null {
  if (!min && !max) return null
  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n)
  if (min && max) return `${fmt(min)}–${fmt(max)}`
  if (max) return `bis ${fmt(max)}`
  return `ab ${fmt(min!)}`
}

/**
 * Map a numeric match score to a stamp color variant.
 * 75+: green (good), 60-74: blue (ok), <60: red (marginal).
 */
function stampVariantForScore(score: number): string {
  if (score >= 75) return "amtlich-stamp--green"
  if (score >= 60) return "amtlich-stamp--blue"
  return ""
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
  const jobTypeLabel = jobType ? JOB_TYPE_LABELS[jobType] ?? jobType : null

  return (
    <Link
      href={href}
      className="amtlich-card group block no-underline"
      style={{ textDecoration: "none" }}
    >
      {/* Header row: company + rubber stamp score */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="mono ink-faded" style={{ fontSize: "0.58rem" }}>
            {company}
          </span>
          <h3
            className="display ink mt-1"
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.2,
              fontVariationSettings: '"opsz" 36, "SOFT" 40, "wght" 550',
            }}
          >
            {title}
          </h3>
        </div>

        {matchScore !== null && matchScore !== undefined && (
          <div className="shrink-0 pt-1">
            <span
              className={`amtlich-stamp ${stampVariantForScore(matchScore)}`}
              style={{ transform: "rotate(2deg)" }}
            >
              {matchScore}/100
            </span>
          </div>
        )}
      </div>

      {/* Divider */}
      <hr className="amtlich-divider" style={{ margin: "10px 0 8px" }} />

      {/* Metadata row — typewriter labels */}
      <dl
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5"
        style={{ fontFamily: "var(--f-mono)", fontSize: "0.68rem" }}
      >
        {location && (
          <div className="flex items-center gap-1 ink-soft">
            <MapPin size={11} strokeWidth={1.8} />
            <span>{location}</span>
          </div>
        )}
        {jobTypeLabel && (
          <div className="flex items-center gap-1 ink-soft">
            <span className="ink-faded" style={{ fontSize: "0.6rem" }}>
              ◈
            </span>
            <span>{jobTypeLabel}</span>
          </div>
        )}
        {salaryLabel && (
          <div className="flex items-center gap-1 ink-soft">
            <Euro size={11} strokeWidth={1.8} />
            <span>
              {salaryLabel}
              {currency && currency !== "EUR" ? ` ${currency}` : ""}
            </span>
          </div>
        )}
        {germanLevel && (
          <div className="flex items-center gap-1 ink-soft">
            <Languages size={11} strokeWidth={1.8} />
            <span>DE {germanLevel}</span>
          </div>
        )}
      </dl>

      {/* Match label text (if provided) */}
      {matchLabel && (
        <p
          className="ink-faded mt-3"
          style={{
            fontFamily: "var(--f-body)",
            fontStyle: "italic",
            fontSize: "0.75rem",
          }}
        >
          {matchLabel.label}
        </p>
      )}
    </Link>
  )
}

export default JobCard
