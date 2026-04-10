"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react"
import { JobCard } from "@/components/jobs-app/JobCard"
import { useJobsAuth } from "@/components/jobs-app/AuthProvider"

interface Job {
  id: string
  [key: string]: unknown
}

export default function JobsPage() {
  const { seeker, loading: authLoading } = useJobsAuth()

  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const [germanLevel, setGermanLevel] = useState("")
  const [profession, setProfession] = useState("")
  const [sort, setSort] = useState("match")

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("sort", sort)
      if (germanLevel) params.set("germanLevel", germanLevel)
      if (profession) params.set("profession", profession)

      const res = await fetch(`/api/jobs-app/jobs?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setJobs(data.jobs ?? [])
        setTotalPages(data.totalPages ?? 1)
      }
    } finally {
      setLoading(false)
    }
  }, [page, sort, germanLevel, profession])

  useEffect(() => {
    if (!authLoading) {
      fetchJobs()
    }
  }, [fetchJobs, authLoading])

  function handleGermanLevelChange(value: string) {
    setGermanLevel(value)
    setPage(1)
  }

  function handleProfessionChange(value: string) {
    setProfession(value)
    setPage(1)
  }

  function handleSortChange(value: string) {
    setSort(value)
    setPage(1)
  }

  const showProfileBanner = !seeker || !seeker.onboardingComplete

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Jobs</h1>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100"
          aria-label="Toggle filters"
        >
          <SlidersHorizontal size={16} />
          <span>Filters</span>
        </button>
      </div>

      {/* Profile banner */}
      {showProfileBanner && (
        <Link
          href="/jobs-app/onboarding"
          className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700 hover:bg-blue-100"
        >
          <span>
            {!seeker
              ? "Create a profile to see personalized match scores"
              : "Complete your profile to see match scores"}
          </span>
          <span className="ml-auto shrink-0 font-medium">Set up &rarr;</span>
        </Link>
      )}

      {/* Filters panel */}
      {showFilters && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* German Level */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                German Level
              </label>
              <select
                value={germanLevel}
                onChange={(e) => handleGermanLevelChange(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="C1">C1</option>
                <option value="C2">C2</option>
              </select>
            </div>

            {/* Profession */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Profession
              </label>
              <select
                value={profession}
                onChange={(e) => handleProfessionChange(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="Nursing">Nursing</option>
                <option value="Engineering">Engineering</option>
                <option value="IT">IT</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Hospitality">Hospitality</option>
                <option value="Accounting">Accounting</option>
                <option value="Teaching">Teaching</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Sort */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Sort by</label>
            <select
              value={sort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="match">Best Match</option>
              <option value="newest">Newest</option>
              <option value="salary">Highest Salary</option>
            </select>
          </div>
        </div>
      )}

      {/* Jobs list */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-gray-200"
            />
          ))
        ) : jobs.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">
            No jobs found
          </p>
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </div>

      {/* Pagination */}
      {!loading && jobs.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          <span className="text-sm text-gray-500">
            {page} / {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
