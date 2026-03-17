import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyPortalToken } from "@/lib/jobs-portal-auth"
import { geocodeCity, GERMAN_CITIES } from "@/lib/german-cities"

// Niche → profession mapping for niche-focused pages
const NICHE_PROFESSIONS: Record<string, string[]> = {
  nursing: ["Nursing", "Healthcare"],
  engineering: ["Engineering", "IT"],
  "student-jobs": ["Student Jobs", "Hospitality"],
}

// GET /api/jobs — Public, returns active job postings with filters + pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const profession = searchParams.get("profession")
    const niche = searchParams.get("niche")
    const germanLevel = searchParams.get("germanLevel")
    const location = searchParams.get("location")
    const city = searchParams.get("city")
    const nearCity = searchParams.get("nearCity")
    const radius = Math.min(200, Math.max(5, parseInt(searchParams.get("radius") || "50", 10)))
    const jobType = searchParams.get("jobType")
    const englishOk = searchParams.get("englishOk")
    const salaryMin = searchParams.get("salaryMin")
    const salaryMax = searchParams.get("salaryMax")
    const postedAfter = searchParams.get("postedAfter")
    const sort = searchParams.get("sort") || "newest"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { active: true }

    // Niche param maps to multiple professions
    if (niche && NICHE_PROFESSIONS[niche]) {
      where.profession = { in: NICHE_PROFESSIONS[niche] }
    } else if (profession) {
      where.profession = profession
    }

    if (germanLevel) where.germanLevel = germanLevel
    if (jobType) where.jobType = jobType

    // English OK filter — jobs with no German requirement or "None" level
    if (englishOk === "true") {
      where.OR = [
        { germanLevel: null },
        { germanLevel: "None" },
        { germanLevel: "A1" },
      ]
    }

    // Salary range filters
    if (salaryMin) where.salaryMin = { gte: parseInt(salaryMin, 10) }
    if (salaryMax) where.salaryMax = { lte: parseInt(salaryMax, 10) }

    // Posted after filter
    if (postedAfter) {
      const date = new Date(postedAfter)
      if (!isNaN(date.getTime())) {
        where.createdAt = { gte: date }
      }
    }

    // Premium check — free users don't see jobs from the last 6 hours
    const premiumToken = request.headers.get("authorization")?.replace("Bearer ", "")
    const premiumPayload = premiumToken ? await verifyPortalToken(premiumToken) : null
    if (!premiumPayload) {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000)
      const existing = (where.createdAt as Record<string, Date> | undefined) || {}
      where.createdAt = { ...existing, lte: sixHoursAgo }
    }

    // Location filter: radius-based or fuzzy match
    if (nearCity) {
      const origin = geocodeCity(nearCity)
      if (origin) {
        // Find all known cities within the radius
        const nearbyCities = Object.entries(GERMAN_CITIES)
          .filter(([, coords]) => haversineKm(origin[1], origin[0], coords[1], coords[0]) <= radius)
          .map(([name]) => name)
        if (nearbyCities.length > 0) {
          // Use AND to combine with any existing OR (e.g., englishOk)
          const locationOr = nearbyCities.map((c) => ({ location: { contains: c, mode: "insensitive" as const } }))
          const existing = where.AND as unknown[] || []
          where.AND = [...existing, { OR: locationOr }]
        }
      }
    } else if (city) {
      where.location = { contains: city, mode: "insensitive" }
    } else if (location) {
      where.location = { contains: location, mode: "insensitive" }
    }

    // Sort options
    let orderBy: Record<string, string>
    switch (sort) {
      case "salary_desc":
        orderBy = { salaryMax: "desc" }
        break
      case "salary_asc":
        orderBy = { salaryMin: "asc" }
        break
      default:
        orderBy = { createdAt: "desc" }
    }

    const [jobs, totalCount, lastUpdatedJob] = await Promise.all([
      prisma.jobPosting.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          slug: true,
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
          source: {
            select: { name: true },
          },
        },
      }),
      prisma.jobPosting.count({ where }),
      prisma.jobPosting.findFirst({
        where: { active: true },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
    ])

    // Get available filter options — cross-filtered so counts reflect active selections
    // Each filter dimension excludes its own selection but includes all others
    const baseFilter: Record<string, unknown> = { active: true }
    if (niche && NICHE_PROFESSIONS[niche]) {
      baseFilter.profession = { in: NICHE_PROFESSIONS[niche] }
    }
    // Include premium/time restriction in counts too
    if (where.createdAt) baseFilter.createdAt = where.createdAt

    // Location counts: apply germanLevel + jobType (but NOT city itself)
    const locationFilter = { ...baseFilter }
    if (germanLevel) locationFilter.germanLevel = germanLevel
    if (jobType) locationFilter.jobType = jobType
    if (englishOk === "true") locationFilter.OR = where.OR

    // Level counts: apply city + jobType (but NOT germanLevel itself)
    const levelFilter = { ...baseFilter }
    if (city) levelFilter.location = { contains: city, mode: "insensitive" }
    else if (location) levelFilter.location = { contains: location, mode: "insensitive" }
    if (jobType) levelFilter.jobType = jobType

    // Profession counts: apply city + germanLevel + jobType
    const professionFilter = { ...baseFilter, ...levelFilter }
    if (germanLevel) professionFilter.germanLevel = germanLevel

    const [professions, levels, locations, noLocationCount] = await Promise.all([
      prisma.jobPosting.groupBy({
        by: ["profession"],
        where: { ...professionFilter, profession: { not: null } },
        _count: true,
      }),
      prisma.jobPosting.groupBy({
        by: ["germanLevel"],
        where: { ...levelFilter, germanLevel: { not: null } },
        _count: true,
      }),
      prisma.jobPosting.groupBy({
        by: ["location"],
        where: { ...locationFilter, location: { not: null } },
        _count: true,
        orderBy: { _count: { location: "desc" } },
        take: 50,
      }),
      prisma.jobPosting.count({ where: { ...locationFilter, OR: [{ location: null }, { location: "" }] } }),
    ])

    // Sum displayed location counts to calculate "Other" remainder
    const displayedLocationTotal = locations.reduce((sum, l) => sum + l._count, 0)
    const allLocationCount = await prisma.jobPosting.count({ where: locationFilter })
    const otherLocationCount = allLocationCount - displayedLocationTotal - noLocationCount

    const totalPages = Math.ceil(totalCount / limit)

    const locationEntries = locations.map((l) => ({ value: l.location!, count: l._count }))
    if (otherLocationCount > 0) {
      locationEntries.push({ value: "Other", count: otherLocationCount })
    }

    return NextResponse.json({
      jobs,
      filters: {
        professions: professions.map((p) => ({ value: p.profession!, count: p._count })),
        germanLevels: levels.map((l) => ({ value: l.germanLevel!, count: l._count })),
        locations: locationEntries,
      },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      total: jobs.length,
      lastUpdated: lastUpdatedJob?.updatedAt || null,
    })
  } catch (error) {
    console.error("[Jobs API] Error:", error)
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 })
  }
}

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
