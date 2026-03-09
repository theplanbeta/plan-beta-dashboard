import { Suspense } from "react"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { generatePageMetadata } from "@/lib/seo"
import {
  getJobBoardCityBySlug,
  generateCityStaticParams as genParams,
  CITY_NICHE_INTROS,
} from "@/lib/german-cities"
import { NicheHero } from "@/components/marketing/jobs/NicheHero"
import { GermanLevelGapBanner } from "@/components/marketing/jobs/GermanLevelGapBanner"
import { NicheJobsList } from "@/components/marketing/jobs/NicheJobsList"
import { BreadcrumbSchema } from "@/components/marketing/SEOStructuredData"

const NICHE = "nursing" as const
const PROFESSIONS = ["Nursing", "Healthcare"]

type Props = { params: Promise<{ city: string }> }

export { genParams as generateStaticParams }

export async function generateMetadata({ params }: Props) {
  const { city: citySlug } = await params
  const city = getJobBoardCityBySlug(citySlug)
  if (!city) return {}
  const intro = CITY_NICHE_INTROS.nursing[city.slug] || ""
  return generatePageMetadata({
    title: `Nursing Jobs in ${city.name}, Germany | Plan Beta`,
    description: `Find nursing and healthcare jobs in ${city.name}, ${city.state}. ${intro} Plan Beta handles your full pathway: German training, Anerkennung, and hospital placement.`,
    keywords: [
      `nursing jobs ${city.name.toLowerCase()}`,
      `healthcare jobs ${city.name.toLowerCase()} germany`,
      `krankenpflege ${city.name.toLowerCase()}`,
      `altenpflege ${city.name.toLowerCase()}`,
      `nurse jobs ${city.name.toLowerCase()}`,
    ],
    path: `/jobs/nursing/${city.slug}`,
  })
}

async function getInitialData(cityName: string) {
  try {
    const where = {
      active: true,
      profession: { in: PROFESSIONS },
      location: { contains: cityName, mode: "insensitive" as const },
    }
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const [jobs, totalCount, lastUpdatedJob, newJobsToday, germanLevels, locations] =
      await Promise.all([
        prisma.jobPosting.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            title: true,
            company: true,
            location: true,
            description: true,
            salaryMin: true,
            salaryMax: true,
            currency: true,
            germanLevel: true,
            profession: true,
            jobType: true,
            requirements: true,
            applyUrl: true,
            postedAt: true,
          },
        }),
        prisma.jobPosting.count({ where }),
        prisma.jobPosting.findFirst({
          where,
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
        prisma.jobPosting.count({ where: { ...where, createdAt: { gte: todayStart } } }),
        prisma.jobPosting.groupBy({
          by: ["germanLevel"],
          where: { ...where, germanLevel: { not: null } },
          _count: true,
        }),
        prisma.jobPosting.groupBy({
          by: ["location"],
          where: { ...where, location: { not: null } },
          _count: true,
          orderBy: { _count: { location: "desc" } },
          take: 50,
        }),
      ])
    return {
      jobs: jobs.map((j) => ({
        ...j,
        salaryMin: j.salaryMin ? Number(j.salaryMin) : null,
        salaryMax: j.salaryMax ? Number(j.salaryMax) : null,
        postedAt: j.postedAt?.toISOString() ?? null,
      })),
      totalCount,
      lastUpdated: lastUpdatedJob?.updatedAt?.toISOString() || null,
      newJobsToday,
      filters: {
        germanLevels: germanLevels.map((l) => ({
          value: l.germanLevel!,
          count: l._count,
        })),
        locations: locations.map((l) => ({
          value: l.location!,
          count: l._count,
        })),
      },
    }
  } catch {
    return {
      jobs: [],
      totalCount: 0,
      lastUpdated: null,
      newJobsToday: 0,
      filters: { germanLevels: [], locations: [] },
    }
  }
}

export default async function NursingCityPage({ params }: Props) {
  const { city: citySlug } = await params
  const city = getJobBoardCityBySlug(citySlug)
  if (!city) notFound()

  const data = await getInitialData(city.name)
  const intro = CITY_NICHE_INTROS.nursing[city.slug] || ""

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://theplanbeta.com" },
          { name: "Jobs", url: "https://theplanbeta.com/jobs" },
          { name: "Nursing", url: "https://theplanbeta.com/jobs/nursing" },
          {
            name: city.name,
            url: `https://theplanbeta.com/jobs/nursing/${city.slug}`,
          },
        ]}
      />
      <NicheHero
        niche={NICHE}
        jobCount={data.totalCount}
        lastUpdated={data.lastUpdated}
        newJobsToday={data.newJobsToday}
      />
      {intro && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-8">
          <div className="bg-[#111] border border-white/[0.06] rounded-xl p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-white mb-2">
              Nursing in {city.name}
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">{intro}</p>
          </div>
        </div>
      )}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <GermanLevelGapBanner niche={NICHE} jobCount={data.totalCount} />
      </div>
      <Suspense
        fallback={
          <div className="py-20 text-center text-gray-500">
            Loading jobs...
          </div>
        }
      >
        <NicheJobsList
          niche={NICHE}
          initialJobs={data.jobs}
          initialPagination={{
            page: 1,
            limit: 20,
            totalCount: data.totalCount,
            totalPages: Math.ceil(data.totalCount / 20),
            hasNext: data.totalCount > 20,
            hasPrev: false,
          }}
          initialFilters={data.filters}
          city={city.slug}
        />
      </Suspense>
    </div>
  )
}
