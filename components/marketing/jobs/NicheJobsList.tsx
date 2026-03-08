"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { NicheJobCard } from "./NicheJobCard"
import { NicheConversionCard } from "./NicheConversionCard"
import { EnhancedFilters } from "./EnhancedFilters"
import { JobListSkeleton } from "./JobCardSkeleton"
import { usePortalAuth } from "./JobPortalAuthProvider"

// Same Job type as API response
interface Job {
  id: string
  slug?: string | null
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
  const { isPremium } = usePortalAuth()

  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [pagination, setPagination] = useState<Pagination>(initialPagination)
  const [filters, setFilters] = useState(initialFilters)
  const [loading, setLoading] = useState(false)

  const initialPage = parseInt(searchParams.get("page") || "1", 10)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [selectedLevel, setSelectedLevel] = useState(searchParams.get("germanLevel") || "")
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get("location") || "")
  const [selectedJobType, setSelectedJobType] = useState(searchParams.get("jobType") || "")
  const [englishOk, setEnglishOk] = useState(false)
  const [sortBy, setSortBy] = useState("newest")
  const [searchQuery, setSearchQuery] = useState("")
  const [salaryMin, setSalaryMin] = useState("")
  const [salaryMax, setSalaryMax] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [debouncedSalaryMin, setDebouncedSalaryMin] = useState("")
  const [debouncedSalaryMax, setDebouncedSalaryMax] = useState("")

  // Debounce search and salary
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSalaryMin(salaryMin), 500)
    return () => clearTimeout(timer)
  }, [salaryMin])
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSalaryMax(salaryMax), 500)
    return () => clearTimeout(timer)
  }, [salaryMax])

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedLevel, selectedLocation, selectedJobType, englishOk, sortBy, debouncedSearch, debouncedSalaryMin, debouncedSalaryMax])

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
      if (selectedJobType) params.set("jobType", selectedJobType)
      if (englishOk && isPremium) params.set("englishOk", "true")
      if (sortBy !== "newest" && isPremium) params.set("sort", sortBy)
      if (debouncedSalaryMin && isPremium) params.set("salaryMin", debouncedSalaryMin)
      if (debouncedSalaryMax && isPremium) params.set("salaryMax", debouncedSalaryMax)
      if (city) params.set("city", city)

      const headers: Record<string, string> = {}
      const token = isPremium ? localStorage.getItem("pb-jobs-token") : null
      if (token) headers.Authorization = `Bearer ${token}`

      const res = await fetch(`/api/jobs?${params}`, { headers })
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
  }, [currentPage, selectedLevel, selectedLocation, selectedJobType, englishOk, sortBy, debouncedSalaryMin, debouncedSalaryMax, niche, city, isInitial, isPremium])

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
      {/* Enhanced Filter Bar */}
      <EnhancedFilters
        filters={filters}
        selectedLevel={selectedLevel}
        selectedLocation={selectedLocation}
        selectedJobType={selectedJobType}
        englishOk={englishOk}
        sortBy={sortBy}
        searchQuery={searchQuery}
        salaryMin={salaryMin}
        salaryMax={salaryMax}
        city={city}
        onLevelChange={setSelectedLevel}
        onLocationChange={setSelectedLocation}
        onJobTypeChange={setSelectedJobType}
        onEnglishOkChange={setEnglishOk}
        onSortChange={setSortBy}
        onSearchChange={setSearchQuery}
        onSalaryMinChange={setSalaryMin}
        onSalaryMaxChange={setSalaryMax}
      />

      {/* Job Listings */}
      {loading ? (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <JobListSkeleton count={6} />
        </div>
      ) : displayedJobs.length > 0 ? (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-gray-500 mb-6">
            Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} jobs
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedJobs.map((job, i) => (
              <div key={job.id}>
                <NicheJobCard job={job} niche={niche} index={i} isPremium={isPremium} />
                {/* Insert conversion card after every 5th job (not for premium) */}
                {!isPremium && (i + 1) % 5 === 0 && i < displayedJobs.length - 1 && (
                  <div className="mt-4">
                    <NicheConversionCard niche={niche} />
                  </div>
                )}
              </div>
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
            onClick={() => { setSelectedLevel(""); setSelectedLocation(""); setSelectedJobType(""); setEnglishOk(false); setSortBy("newest"); setSearchQuery(""); setSalaryMin(""); setSalaryMax("") }}
            className="text-sm text-primary hover:text-primary-light transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}
