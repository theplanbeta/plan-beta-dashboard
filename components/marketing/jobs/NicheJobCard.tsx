"use client"

import Link from "next/link"
import { trackEvent } from "@/lib/tracking"
import { JobShareButton } from "./JobShareButton"
import { SaveJobButton } from "./SaveJobButton"
import { NewBadge } from "./NewBadge"

interface NicheJobCardProps {
  job: {
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
  niche: "nursing" | "engineering" | "student-jobs"
  index: number
  isPremium?: boolean
}

const NICHE_WA_MESSAGES: Record<string, (job: { title: string; company: string }) => string> = {
  nursing: (job) =>
    `Hi! I saw a ${job.title} position at ${job.company} on Plan Beta. I'm interested in your nursing pathway — German training, Anerkennung, and placement. Can you tell me more?`,
  engineering: (job) =>
    `Hi! I saw a ${job.title} position at ${job.company} on Plan Beta. I need German for engineering — can you help me plan my pathway?`,
  "student-jobs": () =>
    `Hi! I'm looking at student jobs in Germany and want to improve my German. What courses do you offer?`,
}

const GERMAN_LEVEL_CTA: Record<string, string> = {
  nursing: "We can get you there",
  engineering: "We train you from A1",
  "student-jobs": "Level up with Plan Beta",
}

// Format relative date
function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return "Today"
  if (diff === 1) return "Yesterday"
  if (diff < 7) return `${diff}d ago`
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
}

function isNewJob(postedAt: string | null): boolean {
  if (!postedAt) return false
  return Date.now() - new Date(postedAt).getTime() < 24 * 60 * 60 * 1000
}

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
}

export function NicheJobCard({ job, niche, index }: NicheJobCardProps) {
  const waMessage = NICHE_WA_MESSAGES[niche](job)
  const waUrl = `https://wa.me/919028396035?text=${encodeURIComponent(waMessage)}`
  const levelCta = GERMAN_LEVEL_CTA[niche]
  const detailUrl = `/jobs/student-jobs/job/${job.slug || job.id}`

  return (
    <div
      className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4 sm:p-6 hover:border-white/[0.12] transition-all group"
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link href={detailUrl} className="text-white font-semibold truncate group-hover:text-primary transition-colors block">
              {job.title}
            </Link>
            {isNewJob(job.postedAt) && <NewBadge />}
          </div>
          <p className="text-gray-400 text-sm">{job.company}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
          {job.postedAt && (
            <span className="text-xs text-gray-600">{formatDate(job.postedAt)}</span>
          )}
          <SaveJobButton jobId={job.id} size="sm" />
        </div>
      </div>

      {/* Badges */}
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
            Requires {job.germanLevel}
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
          {job.salaryMax ? ` – ${job.salaryMax.toLocaleString()}` : "+"}/month
        </p>
      )}

      {/* Requirements (max 2) */}
      {job.requirements.length > 0 && (
        <ul className="space-y-1 mb-4">
          {job.requirements.slice(0, 2).map((req, j) => (
            <li key={j} className="text-xs text-gray-500 flex items-start gap-2">
              <span className="text-gray-700 mt-0.5">&#8226;</span>
              <span className="line-clamp-1">{req}</span>
            </li>
          ))}
        </ul>
      )}

      {/* German level WhatsApp micro-CTA */}
      {job.germanLevel && (
        <div className="mb-4 p-3 bg-primary/5 border border-primary/10 rounded-lg">
          <p className="text-xs text-gray-400">
            This job requires <span className="text-primary font-semibold">{job.germanLevel}</span> German
            {" → "}
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("job_wa_level_click", { jobId: job.id, niche, level: job.germanLevel! })}
              className="text-primary hover:text-primary-light font-medium"
            >
              {levelCta}
            </a>
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-white/[0.06]">
        <Link
          href={detailUrl}
          onClick={() => trackEvent("job_detail_click", { jobId: job.id, title: job.title, niche })}
          className="flex-1 text-center py-2.5 bg-white/5 border border-white/10 text-gray-300 text-xs sm:text-sm font-medium rounded-lg hover:bg-white/10 transition-all"
        >
          View Details
        </Link>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("job_wa_click", { jobId: job.id, title: job.title, niche })}
          className="flex-1 text-center py-2.5 bg-green-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-green-700 transition-all inline-flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Talk to Us
        </a>
        <JobShareButton job={job} niche={niche} />
      </div>
    </div>
  )
}
