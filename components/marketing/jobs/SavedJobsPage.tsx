"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePortalAuth } from "./JobPortalAuthProvider"

interface SavedJobData {
  id: string
  slug: string | null
  title: string
  company: string
  location: string | null
  salaryMin: number | null
  salaryMax: number | null
  currency: string
  germanLevel: string | null
  jobType: string | null
  active: boolean
}

const SAVED_KEY = "pb-saved-jobs"

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  WORKING_STUDENT: "Working Student",
}

export function SavedJobsPage() {
  const { isPremium } = usePortalAuth()
  const [jobs, setJobs] = useState<SavedJobData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isPremium) {
      // Fetch from DB
      const token = localStorage.getItem("pb-jobs-token")
      if (token) {
        fetch("/api/jobs/saved", { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => r.json())
          .then((data) => {
            setJobs((data.savedJobs || []).map((s: { job: SavedJobData }) => s.job))
          })
          .catch(() => {})
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    } else {
      // Load from localStorage
      try {
        const savedIds: string[] = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]")
        if (savedIds.length > 0) {
          // Fetch job details for saved IDs
          Promise.all(
            savedIds.slice(0, 20).map((id) =>
              fetch(`/api/jobs/${id}`).then((r) => r.json()).then((d) => d.job).catch(() => null)
            )
          ).then((results) => {
            setJobs(results.filter(Boolean))
            setLoading(false)
          })
        } else {
          setLoading(false)
        }
      } catch {
        setLoading(false)
      }
    }
  }, [isPremium])

  const removeJob = (jobId: string) => {
    setJobs(jobs.filter((j) => j.id !== jobId))
    if (!isPremium) {
      const savedIds: string[] = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]")
      localStorage.setItem(SAVED_KEY, JSON.stringify(savedIds.filter((id) => id !== jobId)))
    } else {
      const token = localStorage.getItem("pb-jobs-token")
      // Find the saved job record to delete — for now just remove from UI
      // The DB record is cleaned up on next sync
      if (token) {
        // We don't have the savedJob.id here, so we refetch
        fetch("/api/jobs/saved", { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => r.json())
          .then((data) => {
            const saved = data.savedJobs?.find((s: { job: { id: string } }) => s.job.id === jobId)
            if (saved) {
              fetch(`/api/jobs/saved/${saved.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              }).catch(() => {})
            }
          })
          .catch(() => {})
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-white/[0.05] rounded-xl" />
        ))}
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 mb-4">No saved jobs yet</p>
        <p className="text-sm text-gray-600 mb-6">Click the heart icon on any job to save it here</p>
        <Link
          href="/jobs/student-jobs"
          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-all"
        >
          Browse Jobs
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {!isPremium && (
        <p className="text-xs text-gray-600 mb-4">
          Saved locally on this device. <Link href="/jobs/student-jobs" className="text-primary">Upgrade to Premium</Link> to sync across devices.
        </p>
      )}

      {jobs.map((job) => (
        <div key={job.id} className="flex items-center gap-4 bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] transition-all">
          <div className="flex-1 min-w-0">
            <Link href={`/jobs/student-jobs/job/${job.slug || job.id}`} className="text-white font-semibold hover:text-primary transition-colors block truncate">
              {job.title}
            </Link>
            <div className="flex items-center gap-2 text-sm text-gray-400 mt-0.5">
              <span>{job.company}</span>
              {job.location && <span>· {job.location}</span>}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              {job.germanLevel && (
                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded">{job.germanLevel}</span>
              )}
              {job.jobType && (
                <span className="text-[10px] text-gray-500">{JOB_TYPE_LABELS[job.jobType] || job.jobType}</span>
              )}
              {(job.salaryMin || job.salaryMax) && (
                <span className="text-[10px] text-emerald-400">
                  {job.currency} {job.salaryMin?.toLocaleString()}{job.salaryMax ? `–${job.salaryMax.toLocaleString()}` : "+"}
                </span>
              )}
              {!job.active && (
                <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[10px] rounded">Expired</span>
              )}
            </div>
          </div>
          <button
            onClick={() => removeJob(job.id)}
            className="p-2 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
            title="Remove"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
