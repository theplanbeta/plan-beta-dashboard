"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { NicheJobCard } from "./NicheJobCard"
import { NicheConversionCard } from "./NicheConversionCard"

// Same Job type as API response
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
}

interface FilterOption { value: string; count: number }

interface Pagination {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface NicheJobsListProps {
  niche: "nursing" | "engineering" | "student-jobs"
  initialJobs: Job[]
  initialPagination: Pagination
  initialFilters: {
    germanLevels: FilterOption[]
    locations: FilterOption[]
  }
  city?: string
}

export function NicheJobsList({ niche, initialJobs, initialPagination, initialFilters, city }: NicheJobsListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [pagination, setPagination] = useState<Pagination>(initialPagination)
  const [filters, setFilters] = useState(initialFilters)
  const [loading, setLoading] = useState(false)

  const initialPage = parseInt(searchParams.get("page") || "1", 10)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [selectedLevel, setSelectedLevel] = useState(searchParams.get("germanLevel") || "")
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get("location") || "")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedLevel, selectedLocation, debouncedSearch])

  // Fetch jobs when page or filters change (skip initial load — SSR data used)
  const [isInitial, setIsInitial] = useState(true)

  const fetchJobs = useCallback(async () => {
    if (isInitial) { setIsInitial(false); return }
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("niche", niche)
      params.set("page", String(currentPage))
      params.set("limit", "20")
      if (selectedLevel) params.set("germanLevel", selectedLevel)
      if (selectedLocation) params.set("location", selectedLocation)
      if (city) params.set("city", city)

      const res = await fetch(`/api/jobs?${params}`)
      const data = await res.json()
      setJobs(data.jobs || [])
      if (data.pagination) setPagination(data.pagination)
      if (data.filters) {
        setFilters({
          germanLevels: data.filters.germanLevels || [],
          locations: data.filters.locations || [],
        })
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [currentPage, selectedLevel, selectedLocation, niche, city, isInitial])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  // Client-side search filter
  const displayedJobs = debouncedSearch
    ? jobs.filter((job) => {
        const q = debouncedSearch.toLowerCase()
        return job.title.toLowerCase().includes(q) || job.company.toLowerCase().includes(q) || (job.location || "").toLowerCase().includes(q)
      })
    : jobs

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(page))
    const basePath = city ? `/jobs/${niche}/${city}` : `/jobs/${niche}`
    router.push(`${basePath}?${params}`, { scroll: false })
    window.scrollTo({ top: 400, behavior: "smooth" })
  }

  const selectClasses = "px-3 py-2 bg-[#1a1a1a] border border-white/[0.1] rounded-lg text-sm text-white focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"

  // Build page numbers for pagination
  const buildPages = (): (number | "...")[] => {
    const pages: (number | "...")[] = []
    const { page, totalPages } = pagination
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push("...")
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
      if (page < totalPages - 2) pages.push("...")
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div>
      {/* Filter Bar */}
      <div className="sticky top-16 md:top-20 z-30 bg-[#0a0a0a]/90 backdrop-blur-xl py-4 border-b border-white/[0.06] mb-8">
        <div className="flex flex-wrap gap-3 items-center max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex-1 min-w-0 w-full sm:min-w-[200px] sm:w-auto">
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
          <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className={selectClasses}>
            <option value="">Any German Level</option>
            {filters.germanLevels.map((l) => (
              <option key={l.value} value={l.value}>{l.value} ({l.count})</option>
            ))}
          </select>
          {!city && filters.locations.length > 0 && (
            <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className={selectClasses}>
              <option value="">All Locations</option>
              {filters.locations.map((l) => (
                <option key={l.value} value={l.value}>{l.value} ({l.count})</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Job Listings */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-gray-400">
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading jobs...
          </div>
        </div>
      ) : displayedJobs.length > 0 ? (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-gray-500 mb-6">
            Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} jobs
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedJobs.map((job, i) => (
              <>
                <NicheJobCard key={job.id} job={job} niche={niche} index={i} />
                {/* Insert conversion card after every 5th job */}
                {(i + 1) % 5 === 0 && i < displayedJobs.length - 1 && (
                  <NicheConversionCard key={`cta-${i}`} niche={niche} />
                )}
              </>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && !debouncedSearch && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev}
                className="px-3 py-2 text-sm bg-[#1a1a1a] border border-white/[0.1] rounded-lg text-gray-400 hover:text-white hover:border-white/[0.2] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {buildPages().map((p, idx) =>
                  p === "..." ? (
                    <span key={`dots-${idx}`} className="px-2 text-gray-600 text-sm">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-9 h-9 text-sm rounded-lg transition-all ${
                        p === pagination.page ? "bg-primary text-white font-semibold" : "bg-[#1a1a1a] border border-white/[0.1] text-gray-400 hover:text-white hover:border-white/[0.2]"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNext}
                className="px-3 py-2 text-sm bg-[#1a1a1a] border border-white/[0.1] rounded-lg text-gray-400 hover:text-white hover:border-white/[0.2] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16 max-w-5xl mx-auto px-4">
          <p className="text-gray-400 text-sm mb-4">No jobs found matching your criteria.</p>
          <button
            onClick={() => { setSelectedLevel(""); setSelectedLocation(""); setSearchQuery("") }}
            className="text-sm text-primary hover:text-primary-light transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}
