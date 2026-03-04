"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { trackEvent } from "@/lib/tracking"

interface Job {
  id: string
  title: string
  company: string
  location: string | null
  salaryMin: number | null
  salaryMax: number | null
  currency: string
  germanLevel: string | null
  profession: string | null
  jobType: string | null
  requirements: string[]
  applyUrl: string | null
  postedAt: string | null
  source: { name: string }
}

interface FilterOption {
  value: string
  count: number
}

interface Pagination {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface CommunityJob {
  id: string
  imageUrl: string
  title: string | null
  company: string | null
  location: string | null
  cityName: string | null
  germanLevel: string | null
  jobType: string | null
  salaryInfo: string | null
  viewCount: number
  createdAt: string
  status: string
}

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
}

const PROFESSION_LABELS: Record<string, string> = {
  Nursing: "Nursing & Healthcare",
  IT: "IT & Software",
  Engineering: "Engineering",
  Healthcare: "Healthcare",
  Hospitality: "Hospitality",
  Accounting: "Finance & Accounting",
  Teaching: "Teaching",
  "Student Jobs": "Student Jobs",
  Other: "Other",
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return "Today"
  if (diff === 1) return "Yesterday"
  if (diff < 7) return `${diff} days ago`
  if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <JobsPageContent />
    </Suspense>
  )
}

function CommunityJobCard({ job, index }: { job: CommunityJob; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/[0.12] transition-all group"
    >
      <div className="flex">
        <div className="relative w-28 sm:w-36 flex-shrink-0 bg-white/5">
          <img
            src={job.imageUrl}
            alt={job.title || "Job posting photo"}
            className="w-full h-full object-cover min-h-[140px]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#1a1a1a]/30" />
        </div>
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-white font-semibold text-sm truncate group-hover:text-primary transition-colors">
              {job.title || "Job Posting"}
            </h3>
            <span className="text-xs text-gray-600 flex-shrink-0 ml-2">
              {formatDate(job.createdAt)}
            </span>
          </div>
          {(job.company || job.location || job.cityName) && (
            <p className="text-gray-400 text-xs mb-2 truncate">
              {[job.company, job.location || job.cityName].filter(Boolean).join(" \u00B7 ")}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {job.germanLevel && (
              <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-xs text-primary font-medium">
                {job.germanLevel}
              </span>
            )}
            {job.jobType && (
              <span className="px-2 py-0.5 bg-white/5 rounded text-xs text-gray-400">
                {job.jobType}
              </span>
            )}
          </div>
          {job.salaryInfo && (
            <p className="text-xs text-emerald-400 font-medium truncate">{job.salaryInfo}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function PaginationControls({
  pagination,
  onPageChange,
}: {
  pagination: Pagination
  onPageChange: (page: number) => void
}) {
  if (pagination.totalPages <= 1) return null

  // Build page numbers to show
  const pages: (number | "...")[] = []
  const { page, totalPages } = pagination

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push("...")
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i)
    }
    if (page < totalPages - 2) pages.push("...")
    pages.push(totalPages)
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-10">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={!pagination.hasPrev}
        className="px-3 py-2 text-sm bg-[#1a1a1a] border border-white/[0.1] rounded-lg text-gray-400 hover:text-white hover:border-white/[0.2] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Previous
      </button>

      <div className="flex items-center gap-1">
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="px-2 text-gray-600 text-sm">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-9 h-9 text-sm rounded-lg transition-all ${
                p === page
                  ? "bg-primary text-white font-semibold"
                  : "bg-[#1a1a1a] border border-white/[0.1] text-gray-400 hover:text-white hover:border-white/[0.2]"
              }`}
            >
              {p}
            </button>
          )
        )}
      </div>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={!pagination.hasNext}
        className="px-3 py-2 text-sm bg-[#1a1a1a] border border-white/[0.1] rounded-lg text-gray-400 hover:text-white hover:border-white/[0.2] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  )
}

function JobsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialProfession = searchParams.get("profession") || ""
  const initialPage = parseInt(searchParams.get("page") || "1", 10)

  const [jobs, setJobs] = useState<Job[]>([])
  const [communityJobs, setCommunityJobs] = useState<CommunityJob[]>([])
  const [filters, setFilters] = useState<{
    professions: FilterOption[]
    germanLevels: FilterOption[]
    locations: FilterOption[]
  }>({ professions: [], germanLevels: [], locations: [] })
  const [pagination, setPagination] = useState<Pagination>({
    page: initialPage,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  })
  const [loading, setLoading] = useState(true)

  const [currentPage, setCurrentPage] = useState(initialPage)
  const [selectedProfession, setSelectedProfession] = useState(initialProfession)
  const [selectedLevel, setSelectedLevel] = useState("")
  const [selectedLocation, setSelectedLocation] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedProfession, selectedLevel, selectedLocation, debouncedSearch])

  // Fetch jobs from API with current filters + pagination
  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(currentPage))
      params.set("limit", "20")
      if (selectedProfession) params.set("profession", selectedProfession)
      if (selectedLevel) params.set("germanLevel", selectedLevel)
      if (selectedLocation) params.set("location", selectedLocation)

      const [jobsRes, communityRes] = await Promise.all([
        fetch(`/api/jobs?${params}`),
        currentPage === 1
          ? fetch("/api/jobs/community?status=approved&limit=6")
          : Promise.resolve(null),
      ])
      const jobsData = await jobsRes.json()
      setJobs(jobsData.jobs || [])
      setFilters(jobsData.filters || { professions: [], germanLevels: [], locations: [] })
      if (jobsData.pagination) setPagination(jobsData.pagination)

      if (communityRes && communityRes.ok) {
        const communityData = await communityRes.json()
        setCommunityJobs(communityData.jobs || [])
      }
    } catch {
      console.error("Failed to fetch jobs")
    } finally {
      setLoading(false)
    }
  }, [currentPage, selectedProfession, selectedLevel, selectedLocation])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  // Client-side search filter (on top of server-side filters)
  const displayedJobs = debouncedSearch
    ? jobs.filter((job) => {
        const q = debouncedSearch.toLowerCase()
        return (
          job.title.toLowerCase().includes(q) ||
          job.company.toLowerCase().includes(q) ||
          (job.location || "").toLowerCase().includes(q)
        )
      })
    : jobs

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Update URL without full navigation
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(page))
    router.push(`/site/jobs?${params}`, { scroll: false })
    // Scroll to top of job listings
    window.scrollTo({ top: 300, behavior: "smooth" })
  }

  const clearFilters = () => {
    setSelectedProfession("")
    setSelectedLevel("")
    setSelectedLocation("")
    setSearchQuery("")
    setCurrentPage(1)
  }

  const hasFilters = selectedProfession || selectedLevel || selectedLocation || searchQuery
  const hasCommunityJobs = communityJobs.length > 0
  const hasAnyContent = pagination.totalCount > 0 || hasCommunityJobs

  const selectClasses =
    "px-3 py-2 bg-[#1a1a1a] border border-white/[0.1] rounded-lg text-sm text-white focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.06] via-transparent to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-6">
              Find Your Job in{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Germany
              </span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-4">
              Browse real job listings from German employers — nursing, IT, engineering, student jobs, and more.
            </p>
            {pagination.totalCount > 0 && (
              <p className="text-sm text-gray-500">
                {pagination.totalCount} active job{pagination.totalCount !== 1 ? "s" : ""} across Germany
              </p>
            )}
            <div className="mt-6">
              <Link
                href="/site/germany-pathway"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-light transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Not sure if you qualify? Check your eligibility first
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ─── Filter Bar (always visible when there are jobs) ──── */}
          {pagination.totalCount > 0 && (
            <div className="sticky top-16 md:top-20 z-30 bg-[#0a0a0a]/90 backdrop-blur-xl py-4 border-b border-white/[0.06] mb-8">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by title, company, or city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-white/[0.1] rounded-lg text-sm text-white placeholder:text-gray-600 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                  />
                </div>

                <select value={selectedProfession} onChange={(e) => setSelectedProfession(e.target.value)} className={selectClasses}>
                  <option value="">All Professions</option>
                  {filters.professions.map((p) => (
                    <option key={p.value} value={p.value}>
                      {PROFESSION_LABELS[p.value] || p.value} ({p.count})
                    </option>
                  ))}
                </select>

                <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className={selectClasses}>
                  <option value="">Any German Level</option>
                  {filters.germanLevels.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.value} ({l.count})
                    </option>
                  ))}
                </select>

                {filters.locations.length > 0 && (
                  <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className={selectClasses}>
                    <option value="">All Locations</option>
                    {filters.locations.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.value} ({l.count})
                      </option>
                    ))}
                  </select>
                )}

                {hasFilters && (
                  <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-white transition-colors">
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex items-center gap-3 text-gray-400">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading jobs...
              </div>
            </div>
          )}

          {/* ─── Job Listings ───────────────────────────────────────── */}
          {!loading && displayedJobs.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-gray-500">
                  {debouncedSearch
                    ? `${displayedJobs.length} result${displayedJobs.length !== 1 ? "s" : ""} for "${debouncedSearch}"`
                    : `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(pagination.page * pagination.limit, pagination.totalCount)} of ${pagination.totalCount} jobs`}
                </p>
                {pagination.totalPages > 1 && !debouncedSearch && (
                  <p className="text-xs text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedJobs.map((job, i) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                    className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-6 hover:border-white/[0.12] transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold truncate group-hover:text-primary transition-colors">
                          {job.title}
                        </h3>
                        <p className="text-gray-400 text-sm">{job.company}</p>
                      </div>
                      {job.postedAt && (
                        <span className="text-xs text-gray-600 flex-shrink-0 ml-3">
                          {formatDate(job.postedAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {job.location && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 rounded text-xs text-gray-400">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {job.location}
                        </span>
                      )}
                      {job.germanLevel && (
                        <span className="px-2 py-1 bg-primary/10 border border-primary/20 rounded text-xs text-primary font-medium">
                          German {job.germanLevel}
                        </span>
                      )}
                      {job.profession && (
                        <span className="px-2 py-1 bg-blue-500/10 rounded text-xs text-blue-400">
                          {PROFESSION_LABELS[job.profession] || job.profession}
                        </span>
                      )}
                      {job.jobType && (
                        <span className="px-2 py-1 bg-white/5 rounded text-xs text-gray-400">
                          {JOB_TYPE_LABELS[job.jobType] || job.jobType}
                        </span>
                      )}
                    </div>

                    {(job.salaryMin || job.salaryMax) && (
                      <p className="text-sm text-emerald-400 font-medium mb-3">
                        {job.currency} {job.salaryMin?.toLocaleString()}
                        {job.salaryMax ? ` – ${job.salaryMax.toLocaleString()}` : "+"}
                        /month
                      </p>
                    )}

                    {job.requirements.length > 0 && (
                      <ul className="space-y-1 mb-4">
                        {job.requirements.slice(0, 3).map((req, j) => (
                          <li key={j} className="text-xs text-gray-500 flex items-start gap-2">
                            <span className="text-gray-700 mt-1">&#8226;</span>
                            <span className="line-clamp-1">{req}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="flex gap-2 pt-3 border-t border-white/[0.06]">
                      {job.applyUrl && (
                        <a
                          href={job.applyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackEvent("job_apply_click", { jobId: job.id, title: job.title })}
                          className="flex-1 text-center py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-all"
                        >
                          Apply
                        </a>
                      )}
                      <Link
                        href="/site/germany-pathway"
                        onClick={() => trackEvent("job_eligibility_click", { jobId: job.id })}
                        className="flex-1 text-center py-2 bg-white/5 border border-white/10 text-gray-300 text-sm font-medium rounded-lg hover:bg-white/10 transition-all"
                      >
                        Check Eligibility
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {!debouncedSearch && (
                <PaginationControls pagination={pagination} onPageChange={handlePageChange} />
              )}
            </>
          )}

          {/* No results for current filters */}
          {!loading && displayedJobs.length === 0 && pagination.totalCount > 0 && (
            <div className="text-center py-12 mb-12">
              <p className="text-gray-400 text-sm mb-4">No matching jobs. Try adjusting your filters.</p>
              <button onClick={clearFilters} className="text-sm text-primary hover:text-primary-light transition-colors">
                Clear all filters
              </button>
            </div>
          )}

          {/* ─── Community-Spotted Jobs (page 1 only) ─────────────── */}
          {!loading && currentPage === 1 && hasCommunityJobs && (
            <div className="mt-16 mb-12">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Community-Spotted Jobs</h2>
                  <p className="text-gray-400 text-sm">
                    Job postings photographed and shared by students in Germany
                  </p>
                </div>
                <Link
                  href="/site/spot-a-job"
                  onClick={() => trackEvent("spot_a_job_click", { from: "jobs_community_section" })}
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium rounded-full hover:bg-emerald-500/20 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Spot a Job
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {communityJobs.map((cj, i) => (
                  <CommunityJobCard key={cj.id} job={cj} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* ─── Empty State (no jobs at all) ─────────────────────── */}
          {!loading && !hasAnyContent && (
            <div className="text-center py-16">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-full mx-auto mb-6">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Job listings coming soon</h2>
              <p className="text-gray-400 max-w-md mx-auto mb-8">
                We&apos;re actively building our database of jobs in Germany — nursing, IT, engineering, student positions, and more. Check back soon.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/site/spot-a-job"
                  onClick={() => trackEvent("spot_a_job_click", { from: "jobs_empty" })}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white font-semibold rounded-full hover:bg-emerald-600 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Help by Spotting a Job
                </Link>
                <Link
                  href="/site/germany-pathway"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-gray-300 font-medium rounded-full hover:bg-white/10 transition-all"
                >
                  Check Your Eligibility
                </Link>
              </div>
            </div>
          )}

          {/* ─── SpotAJob CTA (page 1 only, when there are jobs) ─── */}
          {!loading && currentPage === 1 && hasAnyContent && (
            <div className="my-12">
              <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center">
                <div className="flex items-center justify-center w-14 h-14 bg-emerald-500/10 rounded-full mx-auto mb-4">
                  <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">SpotAJob</h3>
                <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                  Are you in Germany? Help fellow students by photographing job postings you see — at supermarkets, notice boards, shop windows. Our AI extracts the details automatically.
                </p>
                <Link
                  href="/site/spot-a-job"
                  onClick={() => trackEvent("spot_a_job_click", { from: "jobs_cta" })}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-semibold rounded-full hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/25"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Spot a Job
                </Link>
              </div>
            </div>
          )}

          {/* Bottom CTA */}
          {!loading && (
            <div className="mt-4 text-center">
              <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-2xl p-8">
                <h3 className="text-xl font-bold text-white mb-3">
                  Want to maximize your chances?
                </h3>
                <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                  Most German jobs require at least B1 German. Start learning now and unlock thousands more opportunities.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/site/courses"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary-dark transition-all"
                  >
                    View German Courses
                  </Link>
                  <Link
                    href="/site/germany-pathway"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-gray-300 font-medium rounded-full hover:bg-white/10 transition-all"
                  >
                    Check Your Eligibility
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
