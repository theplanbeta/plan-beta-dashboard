"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"

interface CommunityJob {
  id: string
  imageUrl: string
  title: string | null
  company: string | null
  cityName: string | null
  location: string | null
  germanLevel: string | null
  jobType: string | null
  salaryInfo: string | null
  viewCount: number
  createdAt: string
}

function timeAgo(date: string): string {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}

export default function CommunityJobsSection() {
  const [jobs, setJobs] = useState<CommunityJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/jobs/community?status=approved&limit=6")
      .then((r) => r.json())
      .then((data) => setJobs(data.jobs || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="py-20 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              Community Jobs
            </h2>
            <p className="text-gray-400 max-w-xl">
              Real job postings spotted by students across Germany. See something? Share it!
            </p>
          </div>
          <Link
            href="/spot-a-job"
            className="mt-4 sm:mt-0 inline-flex items-center px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            SpotAJob
          </Link>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-white/[0.04] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.04] border border-white/[0.08] rounded-2xl">
            <svg className="w-12 h-12 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-gray-400 mb-4">
              No community jobs yet. Be the first to share!
            </p>
            <Link
              href="/spot-a-job"
              className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Upload a Job Photo
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden hover:border-white/[0.15] transition-colors group"
              >
                {/* Photo */}
                <div className="relative h-40 bg-gray-800">
                  <Image
                    src={job.imageUrl}
                    alt={job.title || "Job posting"}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>

                {/* Details */}
                <div className="p-4">
                  <h3 className="font-semibold text-white truncate mb-1">
                    {job.title || "Job Posting"}
                  </h3>
                  <p className="text-sm text-gray-400 truncate">
                    {[job.company, job.cityName || job.location].filter(Boolean).join(" - ")}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-2">
                      {job.germanLevel && (
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded">
                          {job.germanLevel}
                        </span>
                      )}
                      {job.jobType && (
                        <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded">
                          {job.jobType}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {timeAgo(job.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
