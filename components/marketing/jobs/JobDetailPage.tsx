"use client"

import Link from "next/link"
import { trackEvent } from "@/lib/tracking"
import { JobShareButton } from "./JobShareButton"
import { SaveJobButton } from "./SaveJobButton"
import { SimilarJobs } from "./SimilarJobs"

interface JobDetail {
  id: string
  slug: string | null
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
  postedAt: string | null
  createdAt: string
  viewCount: number
  source: { name: string }
}

interface SimilarJob {
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
  postedAt: string | null
}

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  WORKING_STUDENT: "Working Student",
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
  return d.toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })
}

function isNewJob(postedAt: string | null): boolean {
  if (!postedAt) return false
  const diff = Date.now() - new Date(postedAt).getTime()
  return diff < 24 * 60 * 60 * 1000
}

export function JobDetailPage({ job, similarJobs }: { job: JobDetail; similarJobs: SimilarJob[] }) {
  const waMessage = `Hi! I saw a ${job.title} position at ${job.company} on Plan Beta. I'm looking at student jobs in Germany and want to improve my German. What courses do you offer?`
  const waUrl = `https://wa.me/919028396035?text=${encodeURIComponent(waMessage)}`

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/jobs" className="hover:text-gray-300 transition-colors">Jobs</Link>
        <span>/</span>
        <Link href="/jobs/student-jobs" className="hover:text-gray-300 transition-colors">Student Jobs</Link>
        <span>/</span>
        <span className="text-gray-400 truncate max-w-[200px]">{job.title}</span>
      </nav>

      {/* Main Card */}
      <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-2xl p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{job.title}</h1>
              {isNewJob(job.postedAt) && (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full">New</span>
              )}
            </div>
            <p className="text-lg text-gray-400">{job.company}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <SaveJobButton jobId={job.id} />
            <JobShareButton job={job} niche="student-jobs" />
          </div>
        </div>

        {/* Meta badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          {job.location && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg text-sm text-gray-300">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {job.location}
            </span>
          )}
          {job.germanLevel && (
            <span className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary font-medium">
              Requires {job.germanLevel}
            </span>
          )}
          {job.jobType && (
            <span className="px-3 py-1.5 bg-white/5 rounded-lg text-sm text-gray-300">
              {JOB_TYPE_LABELS[job.jobType] || job.jobType}
            </span>
          )}
          {job.postedAt && (
            <span className="px-3 py-1.5 bg-white/5 rounded-lg text-sm text-gray-500">
              Posted {formatDate(job.postedAt)}
            </span>
          )}
        </div>

        {/* Salary */}
        {(job.salaryMin || job.salaryMax) && (
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl mb-6">
            <p className="text-sm text-gray-400 mb-1">Salary</p>
            <p className="text-xl font-bold text-emerald-400">
              {job.currency} {job.salaryMin?.toLocaleString()}
              {job.salaryMax ? ` – ${job.salaryMax.toLocaleString()}` : "+"} / month
            </p>
          </div>
        )}

        {/* Description */}
        {job.description && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-3">About this position</h2>
            <div className="text-gray-400 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
              {job.description}
            </div>
          </div>
        )}

        {/* Requirements */}
        {job.requirements.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-3">Requirements</h2>
            <ul className="space-y-2">
              {job.requirements.map((req, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-400 text-sm sm:text-base">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* German level CTA */}
        {job.germanLevel && (
          <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl mb-6">
            <p className="text-sm text-gray-300 mb-2">
              This job requires <span className="text-primary font-bold">{job.germanLevel}</span> level German.
              Plan Beta can get you there with structured online classes.
            </p>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("job_detail_wa_level", { jobId: job.id, level: job.germanLevel! })}
              className="inline-flex items-center gap-1.5 text-primary font-semibold text-sm hover:text-primary-light transition-colors"
            >
              Start learning {job.germanLevel} German →
            </a>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-white/[0.06]">
          {job.applyUrl && (
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("job_detail_apply", { jobId: job.id, title: job.title })}
              className="flex-1 text-center py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-all"
            >
              Apply Now
            </a>
          )}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("job_detail_wa", { jobId: job.id, title: job.title })}
            className="flex-1 text-center py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all inline-flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Talk to Us on WhatsApp
          </a>
        </div>

        {/* Views */}
        <div className="flex items-center justify-end mt-4 text-xs text-gray-600">
          <span>{job.viewCount.toLocaleString()} views</span>
        </div>
      </div>

      {/* Similar Jobs */}
      {similarJobs.length > 0 && (
        <SimilarJobs jobs={similarJobs} />
      )}
    </div>
  )
}
