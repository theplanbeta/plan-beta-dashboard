import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { NicheHero } from "@/components/marketing/jobs/NicheHero"
import { GermanLevelGapBanner } from "@/components/marketing/jobs/GermanLevelGapBanner"
import { NicheJobsList } from "@/components/marketing/jobs/NicheJobsList"
import { NicheFAQ } from "@/components/marketing/jobs/NicheFAQ"
import { JobPortalAuthProvider } from "@/components/marketing/jobs/JobPortalAuthProvider"
import { PremiumBanner } from "@/components/marketing/jobs/PremiumBanner"
import { PortalTokenHandler } from "@/components/marketing/jobs/PortalTokenHandler"
import { PortalAccountBar } from "@/components/marketing/jobs/PortalAccountBar"
import Link from "next/link"

const NICHE = "student-jobs" as const
const PROFESSIONS = ["Student Jobs", "Hospitality"]

async function getInitialData() {
  try {
    const where = { active: true, profession: { in: PROFESSIONS } }
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const [jobs, totalCount, lastUpdatedJob, newJobsToday, germanLevels, locations] = await Promise.all([
      prisma.jobPosting.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true, slug: true, title: true, company: true, location: true, description: true,
          salaryMin: true, salaryMax: true, currency: true, germanLevel: true,
          profession: true, jobType: true, requirements: true, applyUrl: true, postedAt: true,
        },
      }),
      prisma.jobPosting.count({ where }),
      prisma.jobPosting.findFirst({ where, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
      prisma.jobPosting.count({ where: { ...where, createdAt: { gte: todayStart } } }),
      prisma.jobPosting.groupBy({ by: ["germanLevel"], where: { ...where, germanLevel: { not: null } }, _count: true }),
      prisma.jobPosting.groupBy({ by: ["location"], where: { ...where, location: { not: null } }, _count: true, orderBy: { _count: { location: "desc" } }, take: 50 }),
    ])
    return {
      jobs: jobs.map(j => ({ ...j, salaryMin: j.salaryMin ? Number(j.salaryMin) : null, salaryMax: j.salaryMax ? Number(j.salaryMax) : null, postedAt: j.postedAt?.toISOString() ?? null })),
      totalCount,
      lastUpdated: lastUpdatedJob?.updatedAt?.toISOString() || null,
      newJobsToday,
      filters: {
        germanLevels: germanLevels.map(l => ({ value: l.germanLevel!, count: l._count })),
        locations: locations.map(l => ({ value: l.location!, count: l._count })),
      },
    }
  } catch {
    return { jobs: [], totalCount: 0, lastUpdated: null, newJobsToday: 0, filters: { germanLevels: [], locations: [] } }
  }
}

export default async function StudentJobsPage() {
  const data = await getInitialData()
  return (
    <JobPortalAuthProvider>
      <div className="min-h-screen bg-[#0a0a0a]">
        <Suspense fallback={null}><PortalTokenHandler /></Suspense>
        <NicheHero niche={NICHE} jobCount={data.totalCount} lastUpdated={data.lastUpdated} newJobsToday={data.newJobsToday} />

        {/* Account bar */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <PortalAccountBar />
        </div>

        {/* Tools navigation */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-2">
            <Link href="/jobs/student-jobs/salary-insights" className="px-3 py-1.5 bg-white/5 border border-white/[0.08] rounded-lg text-xs text-gray-400 hover:text-white hover:border-white/[0.15] transition-all">
              Salary Insights
            </Link>
            <Link href="/jobs/student-jobs/work-hours" className="px-3 py-1.5 bg-white/5 border border-white/[0.08] rounded-lg text-xs text-gray-400 hover:text-white hover:border-white/[0.15] transition-all">
              Work Hours Calculator
            </Link>
            <Link href="/jobs/student-jobs/german-quiz" className="px-3 py-1.5 bg-white/5 border border-white/[0.08] rounded-lg text-xs text-gray-400 hover:text-white hover:border-white/[0.15] transition-all">
              German Level Quiz
            </Link>
            <Link href="/jobs/student-jobs/saved" className="px-3 py-1.5 bg-white/5 border border-white/[0.08] rounded-lg text-xs text-gray-400 hover:text-white hover:border-white/[0.15] transition-all">
              Saved Jobs
            </Link>
            <Link href="/jobs/student-jobs/werkstudent" className="px-3 py-1.5 bg-white/5 border border-white/[0.08] rounded-lg text-xs text-gray-400 hover:text-white hover:border-white/[0.15] transition-all">
              Werkstudent Guide
            </Link>
            <Link href="/jobs/student-jobs/minijob" className="px-3 py-1.5 bg-white/5 border border-white/[0.08] rounded-lg text-xs text-gray-400 hover:text-white hover:border-white/[0.15] transition-all">
              Minijob Guide
            </Link>
          </div>
        </div>

        {/* Part-time jobs guide reel */}
        <section className="py-8">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
              <div className="rounded-xl overflow-hidden border border-white/[0.08] shrink-0">
                <iframe
                  src="https://www.instagram.com/reel/DHI2V82Skah/embed"
                  width="280"
                  height="360"
                  frameBorder="0"
                  scrolling="no"
                  allowTransparency={true}
                  loading="lazy"
                  title="Guide to finding part-time jobs in Germany"
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  How to Find Part-Time Jobs in Germany
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Watch our quick guide on finding student jobs, Werkstudent positions, and Minijobs in Germany. Tips on where to look, what documents you need, and how to stand out as an international student.
                </p>
              </div>
            </div>
          </div>
        </section>

        <GermanLevelGapBanner niche={NICHE} jobCount={data.totalCount} />
        <Suspense fallback={<div className="py-20 text-center text-gray-500">Loading jobs...</div>}>
          <NicheJobsList
            niche={NICHE}
            initialJobs={data.jobs}
            initialPagination={{ page: 1, limit: 20, totalCount: data.totalCount, totalPages: Math.ceil(data.totalCount / 20), hasNext: data.totalCount > 20, hasPrev: false }}
            initialFilters={data.filters}
          />
        </Suspense>
        <NicheFAQ niche={NICHE} />
        <PremiumBanner />
      </div>
    </JobPortalAuthProvider>
  )
}
