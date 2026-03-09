import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { NicheJobsList } from "@/components/marketing/jobs/NicheJobsList"
import { JobPortalAuthProvider } from "@/components/marketing/jobs/JobPortalAuthProvider"
import Link from "next/link"

async function getMinijobData() {
  try {
    const where = {
      active: true,
      profession: { in: ["Student Jobs", "Hospitality"] },
      OR: [
        { title: { contains: "minijob", mode: "insensitive" as const } },
        { title: { contains: "mini-job", mode: "insensitive" as const } },
        { title: { contains: "450 euro", mode: "insensitive" as const } },
        { title: { contains: "538 euro", mode: "insensitive" as const } },
        { title: { contains: "aushilfe", mode: "insensitive" as const } },
        { title: { contains: "geringfügig", mode: "insensitive" as const } },
      ],
    }

    const [jobs, totalCount, germanLevels, locations] = await Promise.all([
      prisma.jobPosting.findMany({
        where, orderBy: { createdAt: "desc" }, take: 20,
        select: {
          id: true, slug: true, title: true, company: true, location: true, description: true,
          salaryMin: true, salaryMax: true, currency: true, germanLevel: true,
          profession: true, jobType: true, requirements: true, applyUrl: true, postedAt: true,
        },
      }),
      prisma.jobPosting.count({ where }),
      prisma.jobPosting.groupBy({ by: ["germanLevel"], where: { ...where, germanLevel: { not: null } }, _count: true }),
      prisma.jobPosting.groupBy({ by: ["location"], where: { ...where, location: { not: null } }, _count: true, orderBy: { _count: { location: "desc" } }, take: 50 }),
    ])
    return {
      jobs: jobs.map(j => ({ ...j, salaryMin: j.salaryMin ? Number(j.salaryMin) : null, salaryMax: j.salaryMax ? Number(j.salaryMax) : null, postedAt: j.postedAt?.toISOString() ?? null })),
      totalCount,
      filters: {
        germanLevels: germanLevels.map(l => ({ value: l.germanLevel!, count: l._count })),
        locations: locations.map(l => ({ value: l.location!, count: l._count })),
      },
    }
  } catch {
    return { jobs: [], totalCount: 0, filters: { germanLevels: [], locations: [] } }
  }
}

export default async function MinijobPage() {
  const data = await getMinijobData()

  return (
    <JobPortalAuthProvider>
      <div className="min-h-screen bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/jobs/student-jobs" className="hover:text-gray-300 transition-colors">Student Jobs</Link>
            <span>/</span>
            <span className="text-gray-400">Minijob</span>
          </nav>

          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Minijob Positions in Germany</h1>
          <p className="text-gray-400 mb-6 max-w-2xl">
            Mini-jobs (geringfügige Beschäftigung) let you earn up to EUR 538/month completely tax-free.
            No income tax, no social insurance contributions. Perfect for students starting out.
          </p>

          <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-3">Minijob at a Glance</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Max earnings</p>
                <p className="text-white font-medium">EUR 538/month (tax-free)</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Hours</p>
                <p className="text-white font-medium">~10–12 hours/week at minimum wage</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">German required</p>
                <p className="text-white font-medium">Often A1–A2 is enough</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-500">{data.totalCount} minijob positions found</p>
        </div>

        <Suspense fallback={<div className="py-20 text-center text-gray-500">Loading jobs...</div>}>
          <NicheJobsList
            niche="student-jobs"
            initialJobs={data.jobs}
            initialPagination={{ page: 1, limit: 20, totalCount: data.totalCount, totalPages: Math.ceil(data.totalCount / 20), hasNext: data.totalCount > 20, hasPrev: false }}
            initialFilters={data.filters}
          />
        </Suspense>
      </div>
    </JobPortalAuthProvider>
  )
}
