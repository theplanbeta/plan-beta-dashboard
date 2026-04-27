"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { SlidersHorizontal, ChevronLeft, ChevronRight, Search, X } from "lucide-react"
import { JobCard, type JobData } from "@/components/jobs-app/JobCard"
import { useJobsAuth } from "@/components/jobs-app/AuthProvider"
import { ProfileCompletionBanner } from "@/components/jobs-app/ProfileCompletionBanner"
import {
  MigrantFitFilters,
  type MigrantFitState,
  EMPTY_MIGRANT_FIT_STATE,
} from "@/components/jobs-app/MigrantFitFilters"
import {
  VisaSupportFilters,
  type VisaSupportState,
  EMPTY_VISA_SUPPORT_STATE,
} from "@/components/jobs-app/VisaSupportFilters"
import { PremiumGate } from "@/components/marketing/jobs/PremiumGate"

type Job = JobData & { id: string }

function parseMigrantFitFromParams(params: URLSearchParams): MigrantFitState {
  const lang = params.get("lang")?.split(",").filter(Boolean) ?? []
  const anerkennung = params.get("anerkennung")?.split(",").filter(Boolean) ?? []
  const visa = params.get("visa")?.split(",").filter(Boolean) ?? []
  const englishOk = params.get("english") === "1" ? true : null
  return {
    languageLevels: lang,
    englishOk,
    anerkennung,
    visaPathways: visa,
  }
}

function parseVisaSupportFromParams(params: URLSearchParams): VisaSupportState {
  return {
    anerkennungSupport: params.get("as") === "1" ? true : null,
    visaSponsorship: params.get("vs") === "1" ? true : null,
    relocationSupport: params.get("rs") === "1" ? true : null,
  }
}

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
  return (
    <Suspense fallback={null}>
      <JobsPageInner />
    </Suspense>
  )
}

function JobsPageInner() {
  const { seeker, loading: authLoading, isPremium } = useJobsAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const [germanLevel, setGermanLevel] = useState("")
  const [profession, setProfession] = useState("")
  const [sort, setSort] = useState("match")
  // Free-text search across job title + company. Debounced to avoid hammering
  // the API on every keystroke.
  const [searchInput, setSearchInput] = useState("")
  const [q, setQ] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setQ(searchInput.trim())
      setPage(1)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput])

  // Migrant-fit state — initialised from URL params.
  const [migrantFit, setMigrantFit] = useState<MigrantFitState>(() =>
    typeof window === "undefined"
      ? EMPTY_MIGRANT_FIT_STATE
      : parseMigrantFitFromParams(
          new URLSearchParams(window.location.search)
        )
  )

  // Visa & support state (PREMIUM tier) — initialised from URL params.
  const [visaSupport, setVisaSupport] = useState<VisaSupportState>(() =>
    typeof window === "undefined"
      ? EMPTY_VISA_SUPPORT_STATE
      : parseVisaSupportFromParams(
          new URLSearchParams(window.location.search)
        )
  )

  // Re-sync migrant-fit state if URL changes externally (e.g. back/forward).
  // Guard with deep-equal so our own router.replace() doesn't trigger a redundant
  // setState (which would then re-fire fetchJobs via its useCallback dep).
  useEffect(() => {
    const fromUrl = parseMigrantFitFromParams(searchParams)
    setMigrantFit((current) =>
      JSON.stringify(current) === JSON.stringify(fromUrl) ? current : fromUrl
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()])

  // Re-sync visa-support state if URL changes externally — same deep-equal guard.
  useEffect(() => {
    const fromUrl = parseVisaSupportFromParams(searchParams)
    setVisaSupport((current) =>
      JSON.stringify(current) === JSON.stringify(fromUrl) ? current : fromUrl
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()])

  // Push migrant-fit state into URL without scroll/reload.
  const syncMigrantFitToUrl = useCallback(
    (next: MigrantFitState) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next.languageLevels.length > 0) {
        params.set("lang", next.languageLevels.join(","))
      } else {
        params.delete("lang")
      }
      if (next.anerkennung.length > 0) {
        params.set("anerkennung", next.anerkennung.join(","))
      } else {
        params.delete("anerkennung")
      }
      if (next.visaPathways.length > 0) {
        params.set("visa", next.visaPathways.join(","))
      } else {
        params.delete("visa")
      }
      if (next.englishOk === true) {
        params.set("english", "1")
      } else {
        params.delete("english")
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  // Push visa-support state into URL without scroll/reload.
  const syncVisaSupportToUrl = useCallback(
    (next: VisaSupportState) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next.anerkennungSupport === true) {
        params.set("as", "1")
      } else {
        params.delete("as")
      }
      if (next.visaSponsorship === true) {
        params.set("vs", "1")
      } else {
        params.delete("vs")
      }
      if (next.relocationSupport === true) {
        params.set("rs", "1")
      } else {
        params.delete("rs")
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  // profileCompleteness comes from AuthProvider context (no separate fetch).
  const profileCompleteness = seeker?.profile?.profileCompleteness ?? null

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("sort", sort)
      if (germanLevel) params.set("germanLevel", germanLevel)
      if (profession) params.set("profession", profession)
      if (q) params.set("q", q)
      if (migrantFit.languageLevels.length > 0) {
        params.set("lang", migrantFit.languageLevels.join(","))
      }
      if (migrantFit.anerkennung.length > 0) {
        params.set("anerkennung", migrantFit.anerkennung.join(","))
      }
      if (migrantFit.visaPathways.length > 0) {
        params.set("visa", migrantFit.visaPathways.join(","))
      }
      if (migrantFit.englishOk === true) {
        params.set("english", "1")
      }
      if (visaSupport.anerkennungSupport === true) {
        params.set("as", "1")
      }
      if (visaSupport.visaSponsorship === true) {
        params.set("vs", "1")
      }
      if (visaSupport.relocationSupport === true) {
        params.set("rs", "1")
      }

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
  }, [page, sort, germanLevel, profession, q, migrantFit, visaSupport])

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

      {/* ── Profile completeness nudge (for onboarded users with sparse profile) ── */}
      {!showProfileBanner && profileCompleteness !== null && (
        <ProfileCompletionBanner profileCompleteness={profileCompleteness} />
      )}

      {/* ── Free-text position search ───────────────────────── */}
      <div className="amtlich-card amtlich-enter" style={{ padding: "10px 14px" }}>
        <div className="flex items-center gap-2">
          <Search size={16} strokeWidth={1.8} style={{ color: "var(--ink-soft)", flexShrink: 0 }} aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search positions, companies…"
            aria-label="Search positions or companies"
            className="flex-1"
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.95rem",
              color: "var(--ink)",
              background: "transparent",
              border: "none",
              outline: "none",
              padding: "4px 0",
            }}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
              style={{
                color: "var(--ink-soft)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
              }}
            >
              <X size={14} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

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

          <hr className="amtlich-divider mt-4 mb-4" />

          <MigrantFitFilters
            value={migrantFit}
            onChange={(next) => {
              setMigrantFit(next)
              syncMigrantFitToUrl(next)
              resetPage()
            }}
          />

          <hr className="amtlich-divider mt-4 mb-4" />

          {isPremium ? (
            <VisaSupportFilters
              value={visaSupport}
              onChange={(next) => {
                setVisaSupport(next)
                syncVisaSupportToUrl(next)
                resetPage()
              }}
            />
          ) : (
            <PremiumGate feature="Visa & support filters">
              <VisaSupportFilters
                value={EMPTY_VISA_SUPPORT_STATE}
                onChange={() => {}}
              />
            </PremiumGate>
          )}

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
      <div className="space-y-4" aria-busy={loading} aria-live="polite">
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
          <div role="alert" className="amtlich-card text-center" style={{ padding: "36px 22px" }}>
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
