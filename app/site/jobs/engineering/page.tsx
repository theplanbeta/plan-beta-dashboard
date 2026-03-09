import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { NicheHero } from "@/components/marketing/jobs/NicheHero"
import { GermanLevelGapBanner } from "@/components/marketing/jobs/GermanLevelGapBanner"
import { NicheJobsList } from "@/components/marketing/jobs/NicheJobsList"
import { NicheFAQ } from "@/components/marketing/jobs/NicheFAQ"

const NICHE = "engineering" as const
const PROFESSIONS = ["Engineering", "IT"]

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
          id: true, title: true, company: true, location: true, description: true,
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

export default async function EngineeringJobsPage() {
  const data = await getInitialData()
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <NicheHero niche={NICHE} jobCount={data.totalCount} lastUpdated={data.lastUpdated} newJobsToday={data.newJobsToday} />
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
    </div>
  )
}
