import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/jobs — Public, returns active job postings with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const profession = searchParams.get("profession")
    const germanLevel = searchParams.get("germanLevel")
    const location = searchParams.get("location")
    const jobType = searchParams.get("jobType")

    const where: Record<string, unknown> = { active: true }
    if (profession) where.profession = profession
    if (germanLevel) where.germanLevel = germanLevel
    if (location) where.location = { contains: location, mode: "insensitive" }
    if (jobType) where.jobType = jobType

    const jobs = await prisma.jobPosting.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
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
    })

    // Get available filter options for UI
    const professions = await prisma.jobPosting.groupBy({
      by: ["profession"],
      where: { active: true, profession: { not: null } },
      _count: true,
    })
    const levels = await prisma.jobPosting.groupBy({
      by: ["germanLevel"],
      where: { active: true, germanLevel: { not: null } },
      _count: true,
    })
    const locations = await prisma.jobPosting.groupBy({
      by: ["location"],
      where: { active: true, location: { not: null } },
      _count: true,
      orderBy: { _count: { location: "desc" } },
      take: 20,
    })

    return NextResponse.json({
      jobs,
      filters: {
        professions: professions.map((p) => ({ value: p.profession!, count: p._count })),
        germanLevels: levels.map((l) => ({ value: l.germanLevel!, count: l._count })),
        locations: locations.map((l) => ({ value: l.location!, count: l._count })),
      },
      total: jobs.length,
    })
  } catch (error) {
    console.error("[Jobs API] Error:", error)
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 })
  }
}
