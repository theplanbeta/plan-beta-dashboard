"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
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

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
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

function JobsPageContent() {
  const searchParams = useSearchParams()
  const initialProfession = searchParams.get("profession") || ""

  const [jobs, setJobs] = useState<Job[]>([])
  const [filters, setFilters] = useState<{
    professions: FilterOption[]
    germanLevels: FilterOption[]
    locations: FilterOption[]
  }>({ professions: [], germanLevels: [], locations: [] })
  const [loading, setLoading] = useState(true)

  // Client-side filters
  const [selectedProfession, setSelectedProfession] = useState(initialProfession)
  const [selectedLevel, setSelectedLevel] = useState("")
  const [selectedLocation, setSelectedLocation] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch("/api/jobs")
        const data = await res.json()
        setJobs(data.jobs || [])
        setFilters(data.filters || { professions: [], germanLevels: [], locations: [] })
      } catch {
        console.error("Failed to fetch jobs")
      } finally {
        setLoading(false)
      }
    }
    fetchJobs()
  }, [])

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (selectedProfession && job.profession !== selectedProfession) return false
      if (selectedLevel && job.germanLevel !== selectedLevel) return false
      if (selectedLocation && job.location !== selectedLocation) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (
          !job.title.toLowerCase().includes(q) &&
          !job.company.toLowerCase().includes(q) &&
          !(job.location || "").toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [jobs, selectedProfession, selectedLevel, selectedLocation, searchQuery])

  const clearFilters = () => {
    setSelectedProfession("")
    setSelectedLevel("")
    setSelectedLocation("")
    setSearchQuery("")
  }

  const hasFilters = selectedProfession || selectedLevel || selectedLocation || searchQuery

  const selectClasses =
    "px-3 py-2 bg-[#1a1a1a] border border-white/[0.1] rounded-lg text-sm text-white focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.06] via-transparent to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Updated Daily
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-6">
              Find Your Job in{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Germany
              </span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
              Browse curated job listings from top German employers. Filter by profession, city, and German level
              required.
            </p>

            <Link
              href="/site/germany-pathway"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-light transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Not sure if you qualify? Check your eligibility first
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Filter Bar + Jobs */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filter Bar */}
          <div className="sticky top-16 md:top-20 z-30 bg-[#0a0a0a]/90 backdrop-blur-xl py-4 border-b border-white/[0.06] mb-8">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-white/[0.1] rounded-lg text-sm text-white placeholder:text-gray-600 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
              </div>

              {/* Profession */}
              <select value={selectedProfession} onChange={(e) => setSelectedProfession(e.target.value)} className={selectClasses}>
                <option value="">All Professions</option>
                {filters.professions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.value} ({p.count})
                  </option>
                ))}
              </select>

              {/* German Level */}
              <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className={selectClasses}>
                <option value="">Any German Level</option>
                {filters.germanLevels.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.value} ({l.count})
                  </option>
                ))}
              </select>

              {/* Location */}
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

          {/* Results Count */}
          <p className="text-sm text-gray-500 mb-6">
            {loading ? "Loading jobs..." : `${filteredJobs.length} job${filteredJobs.length !== 1 ? "s" : ""} found`}
          </p>

          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-6 animate-pulse">
                  <div className="h-5 bg-white/10 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-white/10 rounded w-1/2 mb-4" />
                  <div className="h-3 bg-white/10 rounded w-full mb-2" />
                  <div className="h-3 bg-white/10 rounded w-2/3" />
                </div>
              ))}
            </div>
          )}

          {/* No Jobs */}
          {!loading && filteredJobs.length === 0 && (
            <div className="text-center py-20">
              <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-white mb-2">
                {jobs.length === 0 ? "Jobs coming soon" : "No matching jobs"}
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                {jobs.length === 0
                  ? "We're currently building our job database. Check back soon!"
                  : "Try adjusting your filters or search query."}
              </p>
              {hasFilters && (
                <button onClick={clearFilters} className="text-sm text-primary hover:text-primary-light transition-colors">
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Job Cards Grid */}
          {!loading && filteredJobs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredJobs.map((job, i) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-6 hover:border-white/[0.12] transition-all group"
                >
                  {/* Header */}
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

                  {/* Tags */}
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
                    {job.jobType && (
                      <span className="px-2 py-1 bg-white/5 rounded text-xs text-gray-400">
                        {JOB_TYPE_LABELS[job.jobType] || job.jobType}
                      </span>
                    )}
                  </div>

                  {/* Salary */}
                  {(job.salaryMin || job.salaryMax) && (
                    <p className="text-sm text-emerald-400 font-medium mb-3">
                      {job.currency} {job.salaryMin?.toLocaleString()}
                      {job.salaryMax ? ` - ${job.salaryMax.toLocaleString()}` : "+"}
                      /month
                    </p>
                  )}

                  {/* Requirements */}
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

                  {/* Actions */}
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
          )}

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-3">
                Don&apos;t see the right job?
              </h3>
              <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                Learn German first and unlock thousands more opportunities. Most German jobs require at least B1 level.
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
        </div>
      </section>
    </div>
  )
}
