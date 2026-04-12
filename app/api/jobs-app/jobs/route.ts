import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getJobSeeker } from "@/lib/jobs-app-auth"
import { computeHeuristicScore, getMatchLabel } from "@/lib/heuristic-scorer"
import type { Prisma } from "@prisma/client"

const LIMIT = 20

// Zod schema for query params. z.coerce.number() gives us NaN-safe parsing
// with a proper 400 instead of a Prisma 500 when someone passes ?page=abc.
const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  sort: z.enum(["match", "newest", "salary"]).default("match"),
  profession: z.string().max(100).optional(),
  germanLevel: z.string().max(10).optional(),
  location: z.string().max(100).optional(),
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const parsed = querySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    profession: searchParams.get("profession") ?? undefined,
    germanLevel: searchParams.get("germanLevel") ?? undefined,
    location: searchParams.get("location") ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const { page, sort, profession, germanLevel, location } = parsed.data

  try {

  // Build where clause
  const where: Prisma.JobPostingWhereInput = { active: true }

  if (profession) {
    where.profession = profession
  }
  if (germanLevel) {
    where.germanLevel = germanLevel
  }
  if (location) {
    where.location = { contains: location, mode: "insensitive" }
  }

  // Determine DB order
  let orderBy: Prisma.JobPostingOrderByWithRelationInput
  if (sort === "salary") {
    orderBy = { salaryMax: "desc" }
  } else {
    // "newest" and "match" both fetch by recency first; match re-sorts in memory
    orderBy = { createdAt: "desc" }
  }

  const skip = (page - 1) * LIMIT

  // Fetch jobs + total count in parallel
  const [rawJobs, total] = await Promise.all([
    prisma.jobPosting.findMany({
      where,
      orderBy,
      skip,
      take: LIMIT,
      select: {
        id: true,
        slug: true,
        title: true,
        company: true,
        location: true,
        salaryMin: true,
        salaryMax: true,
        currency: true,
        germanLevel: true,
        profession: true,
        jobType: true,
        grade: true,
        createdAt: true,
      },
    }),
    prisma.jobPosting.count({ where }),
  ])

  // Optionally authenticate the job seeker (no auth required)
  let profile: {
    germanLevel: string | null
    profession: string | null
    targetLocations: string[]
    salaryMin: number | null
    salaryMax: number | null
    visaStatus: string | null
    yearsOfExperience: number | null
  } | null = null

  try {
    const seeker = await getJobSeeker(request)
    if (seeker?.profile) {
      const p = seeker.profile
      profile = {
        germanLevel: p.germanLevel ?? null,
        profession: p.profession ?? null,
        targetLocations: (p.targetLocations as string[]) ?? [],
        salaryMin: p.salaryMin ?? null,
        salaryMax: p.salaryMax ?? null,
        visaStatus: p.visaStatus ?? null,
        yearsOfExperience: p.yearsOfExperience ?? null,
      }
    }
  } catch {
    // Non-fatal — proceed without profile scoring
  }

  // Score each job if profile is available
  const jobs = rawJobs.map((job) => {
    if (!profile) {
      return {
        ...job,
        matchScore: null,
        matchLabel: null,
      }
    }

    const scorerJob = {
      germanLevel: job.germanLevel ?? null,
      profession: job.profession ?? null,
      location: job.location ?? null,
      jobType: job.jobType ?? null,
      salaryMin: job.salaryMin ?? null,
      salaryMax: job.salaryMax ?? null,
    }

    const matchScore = computeHeuristicScore(profile, scorerJob)
    const matchLabel = getMatchLabel(matchScore)

    return {
      ...job,
      matchScore,
      matchLabel,
    }
  })

  // Re-sort by match score if requested and profile is available
  if (sort === "match" && profile) {
    jobs.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
  }

  return NextResponse.json({
    jobs,
    pagination: {
      page,
      limit: LIMIT,
      total,
      pages: Math.ceil(total / LIMIT),
    },
  })
  } catch (error) {
    console.error("[jobs-app/jobs] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    )
  }
}
