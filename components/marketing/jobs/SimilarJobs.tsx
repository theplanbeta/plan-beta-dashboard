"use client"

import Link from "next/link"

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
  if (diff < 7) return `${diff}d ago`
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
}

export function SimilarJobs({ jobs }: { jobs: SimilarJob[] }) {
  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold text-white mb-6">Similar Jobs</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/student-jobs/job/${job.slug || job.id}`}
            className="block bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] transition-all group"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold truncate group-hover:text-primary transition-colors">
                  {job.title}
                </h3>
                <p className="text-gray-400 text-sm">{job.company}</p>
              </div>
              {job.postedAt && (
                <span className="text-xs text-gray-600 flex-shrink-0 ml-3">{formatDate(job.postedAt)}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {job.location && (
                <span className="px-2 py-0.5 bg-white/5 rounded text-xs text-gray-400">{job.location}</span>
              )}
              {job.germanLevel && (
                <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-xs text-primary">{job.germanLevel}</span>
              )}
              {job.jobType && (
                <span className="px-2 py-0.5 bg-white/5 rounded text-xs text-gray-400">{JOB_TYPE_LABELS[job.jobType] || job.jobType}</span>
              )}
            </div>
            {(job.salaryMin || job.salaryMax) && (
              <p className="text-sm text-emerald-400 font-medium mt-2">
                {job.currency} {job.salaryMin?.toLocaleString()}{job.salaryMax ? ` – ${job.salaryMax.toLocaleString()}` : "+"}/mo
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
