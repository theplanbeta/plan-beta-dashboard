// app/jobs-app/job/[slug]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Euro,
  ExternalLink,
  FileText,
  Loader2,
} from "lucide-react"
import MatchBadge from "@/components/jobs-app/MatchBadge"
import { ScoreBreakdown } from "@/components/jobs-app/ScoreBreakdown"
import { useJobsAuth } from "@/components/jobs-app/AuthProvider"
import type { MatchLabel } from "@/lib/heuristic-scorer"
import type { DeepScoreResult } from "@/lib/jobs-ai"

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  WORKING_STUDENT: "Working Student",
  INTERNSHIP: "Internship",
  CONTRACT: "Contract",
}

interface JobDetail {
  id: string
  slug: string
  title: string
  company: string
  location: string | null
  description: string | null
  salaryMin: number | null
  salaryMax: number | null
  currency: string
  germanLevel: string | null
  profession: string | null
  jobType: string | null
  requirements: string[]
  applyUrl: string | null
  viewCount: number
  createdAt: string
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { seeker, isPremium } = useJobsAuth()
  const [job, setJob] = useState<JobDetail | null>(null)
  const [matchScore, setMatchScore] = useState<number | null>(null)
  const [matchLabel, setMatchLabel] = useState<MatchLabel | null>(null)
  const [deepScore, setDeepScore] = useState<DeepScoreResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    const slug = params.slug as string
    if (!slug) return

    fetch(`/api/jobs-app/jobs/${slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setJob(data.job)
          setMatchScore(data.matchScore)
          setMatchLabel(data.matchLabel)
          setDeepScore(data.deepScore)
        }
      })
      .finally(() => setLoading(false))
  }, [params.slug])

  async function handleGenerateCV() {
    if (!job) return
    setGenerating(true)
    try {
      const res = await fetch("/api/jobs-app/cv/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobPostingId: job.id, language: "en" }),
      })
      const data = await res.json()
      if (res.ok && data.cv?.fileUrl) {
        window.open(data.cv.fileUrl, "_blank")
      } else {
        alert(data.error || "CV generation failed")
      }
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        Job not found.{" "}
        <Link href="/jobs-app/jobs" className="text-blue-600 underline">
          Browse all jobs
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{job.title}</h1>
            <p className="text-sm text-gray-600">{job.company}</p>
          </div>
          {matchScore !== null && matchLabel && (
            <MatchBadge
              score={matchScore}
              label={matchLabel.label}
              color={matchLabel.color}
              bgColor={matchLabel.bgColor}
              size="md"
            />
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
          {job.location && (
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1">
              <MapPin className="h-3 w-3" /> {job.location}
            </span>
          )}
          {job.jobType && (
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1">
              <Briefcase className="h-3 w-3" /> {JOB_TYPE_LABELS[job.jobType] || job.jobType}
            </span>
          )}
          {(job.salaryMin || job.salaryMax) && (
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1">
              <Euro className="h-3 w-3" />
              {job.salaryMin && job.salaryMax
                ? `${job.salaryMin.toLocaleString()} – ${job.salaryMax.toLocaleString()} EUR`
                : job.salaryMin
                ? `From ${job.salaryMin.toLocaleString()} EUR`
                : `Up to ${job.salaryMax?.toLocaleString()} EUR`}
            </span>
          )}
          {job.germanLevel && (
            <span className="rounded-full bg-gray-100 px-2.5 py-1">
              German: {job.germanLevel}
            </span>
          )}
        </div>
      </div>

      {/* AI Score Breakdown (premium only) */}
      {deepScore && <ScoreBreakdown deepScore={deepScore} />}

      {/* Actions */}
      <div className="flex gap-2">
        {isPremium ? (
          <button
            onClick={handleGenerateCV}
            disabled={generating}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-300"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating CV...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" /> Generate CV & Apply
              </>
            )}
          </button>
        ) : (
          <Link
            href="/jobs-app/settings"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <FileText className="h-4 w-4" /> Upgrade to Generate CV
          </Link>
        )}

        {job.applyUrl && (
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4" /> Apply
          </a>
        )}
      </div>

      {/* Description */}
      {job.description && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Description</h2>
          <div className="whitespace-pre-wrap text-sm text-gray-600">
            {job.description}
          </div>
        </div>
      )}

      {/* Requirements */}
      {job.requirements.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Requirements</h2>
          <ul className="list-disc pl-4 text-sm text-gray-600">
            {job.requirements.map((req, i) => (
              <li key={i}>{req}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
