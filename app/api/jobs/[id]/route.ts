import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/jobs/[id] — Get a single job by ID or slug, increment viewCount
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Try by slug first, then by ID
    const job = await prisma.jobPosting.findFirst({
      where: {
        OR: [
          { slug: id },
          { id: id },
        ],
        active: true,
      },
      include: {
        source: { select: { name: true } },
      },
    })

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // Increment view count (fire-and-forget)
    prisma.jobPosting.update({
      where: { id: job.id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {})

    // Fetch similar jobs (same location or profession, excluding current)
    const similarJobs = await prisma.jobPosting.findMany({
      where: {
        active: true,
        id: { not: job.id },
        OR: [
          ...(job.location ? [{ location: { contains: job.location.split(",")[0].trim(), mode: "insensitive" as const } }] : []),
          ...(job.profession ? [{ profession: job.profession }] : []),
          ...(job.germanLevel ? [{ germanLevel: job.germanLevel }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 6,
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
        jobType: true,
        postedAt: true,
      },
    })

    return NextResponse.json({
      job: {
        ...job,
        salaryMin: job.salaryMin ? Number(job.salaryMin) : null,
        salaryMax: job.salaryMax ? Number(job.salaryMax) : null,
        postedAt: job.postedAt?.toISOString() ?? null,
        createdAt: job.createdAt.toISOString(),
      },
      similarJobs: similarJobs.map((j) => ({
        ...j,
        salaryMin: j.salaryMin ? Number(j.salaryMin) : null,
        salaryMax: j.salaryMax ? Number(j.salaryMax) : null,
        postedAt: j.postedAt?.toISOString() ?? null,
      })),
    })
  } catch (error) {
    console.error("[Jobs API] Error fetching job:", error)
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 })
  }
}
