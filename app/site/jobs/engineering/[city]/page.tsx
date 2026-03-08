import { Suspense } from "react"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { generatePageMetadata } from "@/lib/seo"
import { getJobBoardCityBySlug, generateCityStaticParams as genParams, CITY_NICHE_INTROS } from "@/lib/german-cities"
import { NicheHero } from "@/components/marketing/jobs/NicheHero"
import { GermanLevelGapBanner } from "@/components/marketing/jobs/GermanLevelGapBanner"
import { NicheJobsList } from "@/components/marketing/jobs/NicheJobsList"
import { BreadcrumbSchema } from "@/components/marketing/SEOStructuredData"

const NICHE = "engineering" as const
const PROFESSIONS = ["Engineering", "IT"]

type Props = { params: Promise<{ city: string }> }

export async function generateStaticParams() {
  return genParams()
}

export async function generateMetadata({ params }: Props) {
  const { city: slug } = await params
  const city = getJobBoardCityBySlug(slug)
  if (!city) return {}

  return generatePageMetadata({
    title: `Engineering & IT Jobs in ${city.name}, Germany | Plan Beta`,
    description: `Find engineering and IT jobs in ${city.name}, Germany with Blue Card eligibility and visa sponsorship. Browse mechanical, electrical, software, and IT positions in ${city.name}, ${city.state}.`,
    keywords: [
      `engineering jobs ${city.name}`,
      `IT jobs ${city.name} germany`,
      `ingenieur ${city.name}`,
      `blue card ${city.name}`,
      `software engineer ${city.name} germany`,
      `mechanical engineer ${city.name}`,
      `visa sponsorship engineering ${city.name}`,
    ],
    path: `/jobs/engineering/${slug}`,
  })
}

async function getInitialData(cityName: string) {
  try {
    const where = {
      active: true,
      profession: { in: PROFESSIONS },
      location: { contains: cityName, mode: "insensitive" as const },
    }
    const [jobs, totalCount, lastUpdatedJob, germanLevels, locations] = await Promise.all([
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
      prisma.jobPosting.groupBy({ by: ["germanLevel"], where: { ...where, germanLevel: { not: null } }, _count: true }),
      prisma.jobPosting.groupBy({ by: ["location"], where: { ...where, location: { not: null } }, _count: true, orderBy: { _count: { location: "desc" } }, take: 20 }),
    ])
    return {
      jobs: jobs.map(j => ({ ...j, salaryMin: j.salaryMin ? Number(j.salaryMin) : null, salaryMax: j.salaryMax ? Number(j.salaryMax) : null, postedAt: j.postedAt?.toISOString() ?? null })),
      totalCount,
      lastUpdated: lastUpdatedJob?.updatedAt?.toISOString() || null,
      filters: {
        germanLevels: germanLevels.map(l => ({ value: l.germanLevel!, count: l._count })),
        locations: locations.map(l => ({ value: l.location!, count: l._count })),
      },
    }
  } catch {
    return { jobs: [], totalCount: 0, lastUpdated: null, filters: { germanLevels: [], locations: [] } }
  }
}

export default async function EngineeringCityPage({ params }: Props) {
  const { city: slug } = await params
  const city = getJobBoardCityBySlug(slug)
  if (!city) notFound()

  const data = await getInitialData(city.name)
  const cityIntro = CITY_NICHE_INTROS.engineering[city.slug]

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://theplanbeta.com" },
          { name: "Jobs", url: "https://theplanbeta.com/jobs" },
          { name: "Engineering", url: "https://theplanbeta.com/jobs/engineering" },
          { name: city.name, url: `https://theplanbeta.com/jobs/engineering/${slug}` },
        ]}
      />

      <NicheHero niche={NICHE} jobCount={data.totalCount} lastUpdated={data.lastUpdated} />

      {/* City intro section */}
      {cityIntro && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500/[0.06] to-transparent border border-blue-500/[0.1] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-2">
              Engineering & IT in {city.name}
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">{cityIntro}</p>
          </div>
        </section>
      )}

      <GermanLevelGapBanner niche={NICHE} jobCount={data.totalCount} />

      <Suspense fallback={<div className="py-20 text-center text-gray-500">Loading jobs...</div>}>
        <NicheJobsList
          niche={NICHE}
          initialJobs={data.jobs}
          initialPagination={{ page: 1, limit: 20, totalCount: data.totalCount, totalPages: Math.ceil(data.totalCount / 20), hasNext: data.totalCount > 20, hasPrev: false }}
          initialFilters={data.filters}
          city={slug}
        />
      </Suspense>
    </div>
  )
}
