"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react"
import { JobCard, type JobData } from "@/components/jobs-app/JobCard"
import { useJobsAuth } from "@/components/jobs-app/AuthProvider"

type Job = JobData & { id: string }

const GERMAN_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]
const PROFESSIONS = [
  "Nursing",
  "Engineering",
  "IT",
  "Healthcare",
  "Hospitality",
  "Accounting",
  "Teaching",
  "Other",
]

export default function JobsPage() {
  const { seeker, loading: authLoading } = useJobsAuth()

  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const [germanLevel, setGermanLevel] = useState("")
  const [profession, setProfession] = useState("")
  const [sort, setSort] = useState("match")

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("sort", sort)
      if (germanLevel) params.set("germanLevel", germanLevel)
      if (profession) params.set("profession", profession)

      const res = await fetch(`/api/jobs-app/jobs?${params.toString()}`, {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setJobs(data.jobs ?? [])
        setTotalPages(data.totalPages ?? data.pagination?.pages ?? 1)
      } else {
        setFetchError("Could not load jobs. Try again.")
        setJobs([])
      }
    } catch {
      setFetchError("Network error. Check your connection.")
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [page, sort, germanLevel, profession])

  useEffect(() => {
    if (!authLoading) fetchJobs()
  }, [fetchJobs, authLoading])

  function resetPage() {
    setPage(1)
  }

  const showProfileBanner = !seeker || !seeker.onboardingComplete

  return (
    <div className="space-y-5">
      {/* ── Masthead ────────────────────────────────────────── */}
      <header className="amtlich-enter">
        <div className="flex items-center justify-between">
          <span className="amtlich-label">
            <span className="amtlich-rivet" /> Job Index
          </span>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-1.5"
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: "var(--fs-mono-xs)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-soft)",
              background: "transparent",
              border: "1px dotted rgba(140, 102, 24, 0.55)",
              borderRadius: "2px",
              padding: "5px 10px",
            }}
          >
            <SlidersHorizontal size={12} strokeWidth={2} />
            Filter
          </button>
        </div>

        <h1 className="display mt-3" style={{ fontSize: "1.95rem" }}>
          Open Positions
        </h1>
        <p
          className="ink-soft mt-1"
          style={{
            fontFamily: "var(--f-body)",
            fontSize: "0.92rem",
          }}
        >
          Hand-picked roles from the German market, scored against your profile.
        </p>
        <hr className="amtlich-divider mt-3" />
      </header>

      {/* ── Profile banner ──────────────────────────────────── */}
      {showProfileBanner && (
        <Link
          href="/jobs-app/onboarding"
          className="amtlich-card amtlich-enter amtlich-enter-delay-1 block no-underline"
          style={{ textDecoration: "none", padding: "16px 18px" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <span className="mono" style={{ fontSize: "var(--fs-mono-xs)" }}>
                Profile incomplete
              </span>
              <p
                className="ink mt-1"
                style={{
                  fontFamily: "var(--f-body)",
                  fontSize: "0.92rem",
                  lineHeight: 1.35,
                }}
              >
                {!seeker
                  ? "Register your profile to see personalised match scores."
                  : "Complete your profile to unlock match scores on every job."}
              </p>
            </div>
            <span
              className="amtlich-stamp amtlich-stamp--teal"
              style={{
                transform: "rotate(3deg)",
                fontSize: "var(--fs-mono-xs)",
              }}
            >
              Set up
            </span>
          </div>
        </Link>
      )}

      {/* ── Filters panel ───────────────────────────────────── */}
      {showFilters && (
        <div className="amtlich-card amtlich-enter" style={{ padding: "18px" }}>
          <div className="mb-3 flex items-center justify-between">
            <span className="mono">Sort &amp; Filter</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FilterField label="German Level">
              <select
                value={germanLevel}
                onChange={(e) => {
                  setGermanLevel(e.target.value)
                  resetPage()
                }}
                className="amtlich-select"
              >
                <option value="">All levels</option>
                {GERMAN_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Field">
              <select
                value={profession}
                onChange={(e) => {
                  setProfession(e.target.value)
                  resetPage()
                }}
                className="amtlich-select"
              >
                <option value="">All fields</option>
                {PROFESSIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </FilterField>
          </div>

          <div className="mt-3">
            <FilterField label="Sort by">
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value)
                  resetPage()
                }}
                className="amtlich-select"
              >
                <option value="match">Best match</option>
                <option value="newest">Newest first</option>
                <option value="salary">Highest salary</option>
              </select>
            </FilterField>
          </div>

          <style jsx>{`
            .amtlich-select {
              width: 100%;
              font-family: var(--f-mono);
              font-size: var(--fs-mono-sm);
              text-transform: uppercase;
              letter-spacing: 0.06em;
              color: var(--ink);
              background-color: #fbf4dc;
              background-image: linear-gradient(
                180deg,
                #fdf6de 0%,
                #f2e6b8 100%
              );
              border: 1px solid var(--manila-edge);
              border-radius: 3px;
              padding: 8px 12px;
              box-shadow:
                0 1px 2px rgba(60, 40, 20, 0.15) inset,
                0 1px 0 rgba(255, 250, 220, 0.6);
            }
          `}</style>
        </div>
      )}

      {/* ── Job list ────────────────────────────────────────── */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="amtlich-card"
              style={{
                height: "120px",
                opacity: 0.4,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))
        ) : fetchError ? (
          <div className="amtlich-card text-center" style={{ padding: "36px 22px" }}>
            <span
              className="amtlich-stamp amtlich-stamp--ink"
              style={{ transform: "rotate(-3deg)" }}
            >
              Fehler
            </span>
            <p
              className="ink-faded mt-3"
              style={{
                fontFamily: "var(--f-body)",
                fontSize: "0.9rem",
              }}
            >
              {fetchError}
            </p>
            <button
              type="button"
              onClick={() => fetchJobs()}
              className="amtlich-btn mt-4"
              style={{ padding: "10px 20px", fontSize: "var(--fs-mono-xs)" }}
            >
              Try again
            </button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="amtlich-card text-center" style={{ padding: "36px 22px" }}>
            <span
              className="amtlich-stamp amtlich-stamp--ink"
              style={{ transform: "rotate(-3deg)" }}
            >
              No matches
            </span>
            <p
              className="ink-faded mt-3"
              style={{
                fontFamily: "var(--f-body)",
                fontSize: "0.9rem",
              }}
            >
              Try adjusting your filters or profile preferences.
            </p>
          </div>
        ) : (
          jobs.map((job, i) => (
            <div
              key={job.id}
              className="amtlich-enter"
              style={{ animationDelay: `${Math.min(i * 40, 200)}ms` }}
            >
              <JobCard {...job} />
            </div>
          ))
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────── */}
      {!loading && jobs.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="amtlich-btn disabled:cursor-not-allowed disabled:opacity-40"
            style={{ padding: "10px 16px", fontSize: "var(--fs-mono-xs)" }}
          >
            <ChevronLeft size={12} className="inline-block mr-1" />
            Back
          </button>

          <span
            className="mono ink-faded"
            style={{ fontSize: "var(--fs-mono-xs)" }}
          >
            Page {page} / {totalPages}
          </span>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="amtlich-btn disabled:cursor-not-allowed disabled:opacity-40"
            style={{ padding: "10px 16px", fontSize: "var(--fs-mono-xs)" }}
          >
            Next
            <ChevronRight size={12} className="inline-block ml-1" />
          </button>
        </div>
      )}
    </div>
  )
}

function FilterField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="mono"
        style={{ fontSize: "var(--fs-mono-xs)", color: "var(--ink-faded)" }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}
