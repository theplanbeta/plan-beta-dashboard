"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"

interface CommunityJob {
  id: string
  imageUrl: string
  title: string | null
  company: string | null
  location: string | null
  description: string | null
  contactInfo: string | null
  germanLevel: string | null
  jobType: string | null
  salaryInfo: string | null
  cityName: string | null
  latitude: number | null
  longitude: number | null
  photoTakenAt: string | null
  submittedBy: string | null
  submitterType: string
  status: string
  moderatedBy: string | null
  moderatedAt: string | null
  moderationNote: string | null
  viewCount: number
  reportCount: number
  createdAt: string
  expiresAt: string | null
}

export default function CommunityJobsModerationPage() {
  const [jobs, setJobs] = useState<CommunityJob[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("pending")
  const [selectedJob, setSelectedJob] = useState<CommunityJob | null>(null)
  const [moderationNote, setModerationNote] = useState("")
  const [processing, setProcessing] = useState<string | null>(null)
  const [message, setMessage] = useState({ type: "", text: "" })
  const [editFields, setEditFields] = useState<Record<string, string>>({})
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 })

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/jobs/community?status=${statusFilter}&limit=50`)
      if (res.ok) {
        const data = await res.json()
        setJobs(data.jobs || [])
      }
    } catch {
      setMessage({ type: "error", text: "Failed to load jobs" })
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  const fetchStats = useCallback(async () => {
    try {
      const [pending, approved, rejected] = await Promise.all([
        fetch("/api/jobs/community?status=pending&limit=1").then((r) => r.json()),
        fetch("/api/jobs/community?status=approved&limit=1").then((r) => r.json()),
        fetch("/api/jobs/community?status=rejected&limit=1").then((r) => r.json()),
      ])
      setStats({
        pending: pending.total || 0,
        approved: approved.total || 0,
        rejected: rejected.total || 0,
      })
    } catch {
      // Stats are non-critical
    }
  }, [])

  useEffect(() => {
    fetchJobs()
    fetchStats()
  }, [fetchJobs, fetchStats])

  const handleModerate = async (jobId: string, status: "approved" | "rejected") => {
    setProcessing(jobId)
    try {
      const body: Record<string, unknown> = { status, moderationNote }

      // Include any edited fields
      if (Object.keys(editFields).length > 0) {
        Object.assign(body, editFields)
      }

      const res = await fetch(`/api/jobs/community/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setMessage({ type: "success", text: `Job ${status}` })
        setSelectedJob(null)
        setModerationNote("")
        setEditFields({})
        fetchJobs()
        fetchStats()
      } else {
        setMessage({ type: "error", text: "Failed to moderate job" })
      }
    } catch {
      setMessage({ type: "error", text: "Request failed" })
    } finally {
      setProcessing(null)
    }
  }

  const handleDelete = async (jobId: string) => {
    if (!confirm("Delete this job and its image permanently?")) return
    setProcessing(jobId)
    try {
      const res = await fetch(`/api/jobs/community/${jobId}`, { method: "DELETE" })
      if (res.ok) {
        setMessage({ type: "success", text: "Job deleted" })
        setSelectedJob(null)
        fetchJobs()
        fetchStats()
      }
    } catch {
      setMessage({ type: "error", text: "Failed to delete" })
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Community Job Moderation</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and approve community-submitted job postings (SpotAJob)
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`p-4 rounded-lg border text-left transition-colors ${
              statusFilter === s
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats[s]}
            </p>
            <p className="text-sm text-gray-500 capitalize">{s}</p>
          </button>
        ))}
      </div>

      {/* Messages */}
      {message.text && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === "error"
              ? "bg-red-50 dark:bg-red-900/20 text-red-600"
              : "bg-green-50 dark:bg-green-900/20 text-green-600"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Job List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500">No {statusFilter} jobs to show.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className={`flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border cursor-pointer transition-colors ${
                selectedJob?.id === job.id
                  ? "border-blue-500"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
              }`}
              onClick={() => {
                setSelectedJob(selectedJob?.id === job.id ? null : job)
                setEditFields({})
                setModerationNote("")
              }}
            >
              {/* Thumbnail */}
              <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 relative">
                <Image
                  src={job.imageUrl}
                  alt={job.title || "Job photo"}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {job.title || "Untitled job"}
                  </h3>
                  {job.reportCount > 0 && (
                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 text-xs rounded">
                      {job.reportCount} report{job.reportCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {[job.company, job.cityName || job.location].filter(Boolean).join(" - ") || "No details extracted"}
                </p>
                <div className="flex gap-3 mt-1 text-xs text-gray-400">
                  <span>{new Date(job.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  {job.jobType && <span>{job.jobType}</span>}
                  {job.germanLevel && <span>{job.germanLevel}</span>}
                </div>
              </div>

              {/* Quick actions for pending */}
              {statusFilter === "pending" && (
                <div className="flex gap-2 items-center flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleModerate(job.id, "approved") }}
                    disabled={processing === job.id}
                    className="px-3 py-1.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleModerate(job.id, "rejected") }}
                    disabled={processing === job.id}
                    className="px-3 py-1.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Expanded Job Detail Panel */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setSelectedJob(null)}>
          <div
            className="w-full max-w-xl bg-white dark:bg-gray-800 h-full overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Review Job Submission</h2>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Full image */}
            <div className="rounded-lg overflow-hidden mb-4 bg-gray-100 dark:bg-gray-700 relative" style={{ height: 300 }}>
              <Image
                src={selectedJob.imageUrl}
                alt={selectedJob.title || "Job photo"}
                fill
                className="object-contain"
                sizes="(max-width: 640px) 100vw, 576px"
              />
            </div>

            {/* Metadata */}
            <div className="text-xs text-gray-400 space-y-1 mb-4">
              <p>Submitted: {new Date(selectedJob.createdAt).toLocaleString("en-IN")}</p>
              {selectedJob.cityName && <p>Location: {selectedJob.cityName}</p>}
              {selectedJob.latitude && <p>GPS: {selectedJob.latitude.toFixed(4)}, {selectedJob.longitude?.toFixed(4)}</p>}
              {selectedJob.photoTakenAt && <p>Photo taken: {new Date(selectedJob.photoTakenAt).toLocaleDateString("en-IN")}</p>}
              <p>Submitter: {selectedJob.submitterType} ({selectedJob.submittedBy?.slice(0, 8) || "unknown"})</p>
              {selectedJob.expiresAt && <p>Expires: {new Date(selectedJob.expiresAt).toLocaleDateString("en-IN")}</p>}
            </div>

            {/* Editable extracted fields */}
            <div className="space-y-3 mb-4">
              <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                AI-Extracted Details (editable)
              </h3>
              {(["title", "company", "location", "description", "jobType", "germanLevel", "contactInfo", "salaryInfo"] as const).map((field) => (
                <div key={field}>
                  <label className="block text-xs text-gray-500 mb-1 capitalize">{field.replace(/([A-Z])/g, " $1")}</label>
                  <input
                    type="text"
                    value={editFields[field] ?? (selectedJob[field] || "")}
                    onChange={(e) => setEditFields((f) => ({ ...f, [field]: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={`No ${field} extracted`}
                  />
                </div>
              ))}
            </div>

            {/* Moderation note */}
            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-1">Moderation Note (optional)</label>
              <textarea
                value={moderationNote}
                onChange={(e) => setModerationNote(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={2}
                placeholder="Reason for approval/rejection..."
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleModerate(selectedJob.id, "approved")}
                disabled={processing === selectedJob.id}
                className="flex-1 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {processing === selectedJob.id ? "..." : "Approve"}
              </button>
              <button
                onClick={() => handleModerate(selectedJob.id, "rejected")}
                disabled={processing === selectedJob.id}
                className="flex-1 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {processing === selectedJob.id ? "..." : "Reject"}
              </button>
              <button
                onClick={() => handleDelete(selectedJob.id)}
                disabled={processing === selectedJob.id}
                className="py-2.5 px-4 border border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
