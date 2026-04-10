import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getJobSeeker } from "@/lib/jobs-app-auth"
import { computeHeuristicScore, getMatchLabel } from "@/lib/heuristic-scorer"
import type { Prisma } from "@prisma/client"

const LIMIT = 20

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const sort = searchParams.get("sort") ?? "match"
  const profession = searchParams.get("profession")
  const germanLevel = searchParams.get("germanLevel")
  const location = searchParams.get("location")

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
}
