"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { trackEvent } from "@/lib/tracking"

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
  source: { name: string }
}

interface FilterOption {
  value: string
  count: number
}

interface CommunityJob {
  id: string
  imageUrl: string
  title: string | null
  company: string | null
  location: string | null
  cityName: string | null
  germanLevel: string | null
  jobType: string | null
  salaryInfo: string | null
  viewCount: number
  createdAt: string
  status: string
}

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
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
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
}

// Curated German job portals — always shown so the page is never empty
const jobPortals = [
  {
    name: "Arbeitsagentur",
    description: "Germany's official federal employment agency. The largest job database in the country.",
    url: "https://www.arbeitsagentur.de/jobsuche/",
    germanLevel: "B1+",
    category: "All Professions",
    icon: "briefcase",
  },
  {
    name: "Make it in Germany",
    description: "Official German government portal for qualified professionals from abroad.",
    url: "https://www.make-it-in-germany.com/en/working-in-germany/job-listings",
    germanLevel: "A2+",
    category: "Skilled Workers",
    icon: "globe",
  },
  {
    name: "StepStone",
    description: "One of Germany's top job boards with thousands of listings across industries.",
    url: "https://www.stepstone.de/",
    germanLevel: "B1+",
    category: "All Professions",
    icon: "search",
  },
  {
    name: "LinkedIn Germany",
    description: "Professional network with English-friendly tech and engineering roles.",
    url: "https://www.linkedin.com/jobs/search/?location=Germany",
    germanLevel: "A2+",
    category: "IT & Engineering",
    icon: "link",
  },
  {
    name: "Indeed Germany",
    description: "Global job board with extensive German listings. Filter by English-speaking roles.",
    url: "https://de.indeed.com/",
    germanLevel: "A2+",
    category: "All Professions",
    icon: "search",
  },
  {
    name: "Stellenwerk",
    description: "University job boards across Germany — ideal for students and graduates.",
    url: "https://www.stellenwerk.de/",
    germanLevel: "A2+",
    category: "Students & Graduates",
    icon: "academic",
  },
  {
    name: "Ausbildung.de",
    description: "Germany's vocational training portal. Find Ausbildung (apprenticeship) positions.",
    url: "https://www.ausbildung.de/",
    germanLevel: "B1+",
    category: "Ausbildung",
    icon: "certificate",
  },
  {
    name: "Pflegejob24",
    description: "Specialized portal for nursing and healthcare jobs across Germany.",
    url: "https://www.pflegejob24.de/",
    germanLevel: "B2",
    category: "Nursing & Healthcare",
    icon: "heart",
  },
]

const portalIcons: Record<string, React.ReactNode> = {
  briefcase: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  ),
  globe: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
  search: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  ),
  link: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.354a4.5 4.5 0 00-6.364-6.364L4.5 8.25a4.5 4.5 0 006.364 6.364" />
    </svg>
  ),
  academic: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
    </svg>
  ),
  certificate: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
  heart: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  ),
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <JobsPageContent />
    </Suspense>
  )
}

function CommunityJobCard({ job, index }: { job: CommunityJob; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/[0.12] transition-all group"
    >
      <div className="flex">
        {/* Thumbnail */}
        <div className="relative w-28 sm:w-36 flex-shrink-0 bg-white/5">
          <img
            src={job.imageUrl}
            alt={job.title || "Job posting photo"}
            className="w-full h-full object-cover min-h-[140px]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#1a1a1a]/30" />
        </div>

        {/* Content */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-white font-semibold text-sm truncate group-hover:text-primary transition-colors">
              {job.title || "Job Posting"}
            </h3>
            <span className="text-xs text-gray-600 flex-shrink-0 ml-2">
              {formatDate(job.createdAt)}
            </span>
          </div>

          {(job.company || job.location || job.cityName) && (
            <p className="text-gray-400 text-xs mb-2 truncate">
              {[job.company, job.location || job.cityName].filter(Boolean).join(" \u00B7 ")}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5 mb-2">
            {job.germanLevel && (
              <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-xs text-primary font-medium">
                {job.germanLevel}
              </span>
            )}
            {job.jobType && (
              <span className="px-2 py-0.5 bg-white/5 rounded text-xs text-gray-400">
                {job.jobType}
              </span>
            )}
          </div>

          {job.salaryInfo && (
            <p className="text-xs text-emerald-400 font-medium mb-2 truncate">
              {job.salaryInfo}
            </p>
          )}

          <div className="flex items-center gap-1 text-xs text-gray-600">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Spotted by community
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function JobsPageContent() {
  const searchParams = useSearchParams()
  const initialProfession = searchParams.get("profession") || ""

  const [jobs, setJobs] = useState<Job[]>([])
  const [communityJobs, setCommunityJobs] = useState<CommunityJob[]>([])
  const [filters, setFilters] = useState<{
    professions: FilterOption[]
    germanLevels: FilterOption[]
    locations: FilterOption[]
  }>({ professions: [], germanLevels: [], locations: [] })
  const [loading, setLoading] = useState(true)

  const [selectedProfession, setSelectedProfession] = useState(initialProfession)
  const [selectedLevel, setSelectedLevel] = useState("")
  const [selectedLocation, setSelectedLocation] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    async function fetchJobs() {
      try {
        const [jobsRes, communityRes] = await Promise.all([
          fetch("/api/jobs"),
          fetch("/api/jobs/community?status=approved&limit=12"),
        ])
        const jobsData = await jobsRes.json()
        setJobs(jobsData.jobs || [])
        setFilters(jobsData.filters || { professions: [], germanLevels: [], locations: [] })

        if (communityRes.ok) {
          const communityData = await communityRes.json()
          setCommunityJobs(communityData.jobs || [])
        }
      } catch {
        console.error("Failed to fetch jobs")
      } finally {
        setLoading(false)
      }
    }
    fetchJobs()
  }, [])

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (selectedProfession && job.profession !== selectedProfession) return false
      if (selectedLevel && job.germanLevel !== selectedLevel) return false
      if (selectedLocation && job.location !== selectedLocation) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (
          !job.title.toLowerCase().includes(q) &&
          !job.company.toLowerCase().includes(q) &&
          !(job.location || "").toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [jobs, selectedProfession, selectedLevel, selectedLocation, searchQuery])

  const clearFilters = () => {
    setSelectedProfession("")
    setSelectedLevel("")
    setSelectedLocation("")
    setSearchQuery("")
  }

  const hasFilters = selectedProfession || selectedLevel || selectedLocation || searchQuery
  const hasDbJobs = jobs.length > 0

  const selectClasses =
    "px-3 py-2 bg-[#1a1a1a] border border-white/[0.1] rounded-lg text-sm text-white focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.06] via-transparent to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-6">
              Find Your Job in{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Germany
              </span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
              Browse job listings, explore top German job portals, and discover community-spotted opportunities.
            </p>

            <Link
              href="/site/germany-pathway"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-light transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Not sure if you qualify? Check your eligibility first
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ─── Job Portals (always visible) ─────────────────────────── */}
          <div className="mb-16">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-white mb-2">Top German Job Portals</h2>
              <p className="text-gray-400 text-sm max-w-lg mx-auto">
                Start your search on these trusted platforms. Each links directly to active job listings in Germany.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {jobPortals.map((portal, i) => (
                <motion.a
                  key={portal.name}
                  href={portal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent("job_portal_click", { portal: portal.name })}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.15] hover:bg-[#1e1e1e] transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                      {portalIcons[portal.icon]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold text-sm group-hover:text-blue-400 transition-colors">
                          {portal.name}
                        </h3>
                        <svg className="w-3.5 h-3.5 text-gray-600 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-xs mb-2 line-clamp-2">{portal.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-xs text-primary font-medium">
                          {portal.germanLevel}
                        </span>
                        <span className="px-2 py-0.5 bg-white/5 rounded text-xs text-gray-400">
                          {portal.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>

          {/* ─── Community-Spotted Jobs ────────────────────────────── */}
          {!loading && communityJobs.length > 0 && (
            <div className="mb-16">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Community-Spotted Jobs</h2>
                  <p className="text-gray-400 text-sm">
                    Job postings photographed and shared by students in Germany
                  </p>
                </div>
                <Link
                  href="/site/spot-a-job"
                  onClick={() => trackEvent("spot_a_job_click", { from: "jobs_community_section" })}
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium rounded-full hover:bg-emerald-500/20 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Spot a Job
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {communityJobs.map((cj, i) => (
                  <CommunityJobCard key={cj.id} job={cj} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* ─── SpotAJob CTA (always visible) ────────────────────── */}
          <div className="mb-16">
            <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center">
              <div className="flex items-center justify-center w-14 h-14 bg-emerald-500/10 rounded-full mx-auto mb-4">
                <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">SpotAJob</h3>
              <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                Are you in Germany? Help fellow students by photographing job postings you see — at supermarkets, notice boards, shop windows. Our AI extracts the details automatically.
              </p>
              <Link
                href="/site/spot-a-job"
                onClick={() => trackEvent("spot_a_job_click", { from: "jobs_cta" })}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-semibold rounded-full hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/25"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Spot a Job
              </Link>
            </div>
          </div>

          {/* ─── Scraped DB Jobs (when available) ─────────────────── */}
          {hasDbJobs && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Curated Job Listings</h2>
                <p className="text-gray-400 text-sm">Active positions from German employers</p>
              </div>

              {/* Filter Bar */}
              <div className="sticky top-16 md:top-20 z-30 bg-[#0a0a0a]/90 backdrop-blur-xl py-4 border-b border-white/[0.06] mb-8">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search jobs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-white/[0.1] rounded-lg text-sm text-white placeholder:text-gray-600 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                    />
                  </div>

                  <select value={selectedProfession} onChange={(e) => setSelectedProfession(e.target.value)} className={selectClasses}>
                    <option value="">All Professions</option>
                    {filters.professions.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.value} ({p.count})
                      </option>
                    ))}
                  </select>

                  <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className={selectClasses}>
                    <option value="">Any German Level</option>
                    {filters.germanLevels.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.value} ({l.count})
                      </option>
                    ))}
                  </select>

                  {filters.locations.length > 0 && (
                    <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className={selectClasses}>
                      <option value="">All Locations</option>
                      {filters.locations.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.value} ({l.count})
                        </option>
                      ))}
                    </select>
                  )}

                  {hasFilters && (
                    <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-white transition-colors">
                      Clear filters
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-6">
                {`${filteredJobs.length} job${filteredJobs.length !== 1 ? "s" : ""} found`}
              </p>

              {filteredJobs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm mb-4">No matching jobs. Try adjusting your filters.</p>
                  <button onClick={clearFilters} className="text-sm text-primary hover:text-primary-light transition-colors">
                    Clear all filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredJobs.map((job, i) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-6 hover:border-white/[0.12] transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold truncate group-hover:text-primary transition-colors">
                            {job.title}
                          </h3>
                          <p className="text-gray-400 text-sm">{job.company}</p>
                        </div>
                        {job.postedAt && (
                          <span className="text-xs text-gray-600 flex-shrink-0 ml-3">
                            {formatDate(job.postedAt)}
                          </span>
                        )}
                      </div>

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
                            German {job.germanLevel}
                          </span>
                        )}
                        {job.jobType && (
                          <span className="px-2 py-1 bg-white/5 rounded text-xs text-gray-400">
                            {JOB_TYPE_LABELS[job.jobType] || job.jobType}
                          </span>
                        )}
                      </div>

                      {(job.salaryMin || job.salaryMax) && (
                        <p className="text-sm text-emerald-400 font-medium mb-3">
                          {job.currency} {job.salaryMin?.toLocaleString()}
                          {job.salaryMax ? ` - ${job.salaryMax.toLocaleString()}` : "+"}
                          /month
                        </p>
                      )}

                      {job.requirements.length > 0 && (
                        <ul className="space-y-1 mb-4">
                          {job.requirements.slice(0, 3).map((req, j) => (
                            <li key={j} className="text-xs text-gray-500 flex items-start gap-2">
                              <span className="text-gray-700 mt-1">&#8226;</span>
                              <span className="line-clamp-1">{req}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="flex gap-2 pt-3 border-t border-white/[0.06]">
                        {job.applyUrl && (
                          <a
                            href={job.applyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackEvent("job_apply_click", { jobId: job.id, title: job.title })}
                            className="flex-1 text-center py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-all"
                          >
                            Apply
                          </a>
                        )}
                        <Link
                          href="/site/germany-pathway"
                          onClick={() => trackEvent("job_eligibility_click", { jobId: job.id })}
                          className="flex-1 text-center py-2 bg-white/5 border border-white/10 text-gray-300 text-sm font-medium rounded-lg hover:bg-white/10 transition-all"
                        >
                          Check Eligibility
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-3">
                Want to maximize your chances?
              </h3>
              <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                Most German jobs require at least B1 German. Start learning now and unlock thousands more opportunities.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/site/courses"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary-dark transition-all"
                >
                  View German Courses
                </Link>
                <Link
                  href="/site/germany-pathway"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-gray-300 font-medium rounded-full hover:bg-white/10 transition-all"
                >
                  Check Your Eligibility
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
