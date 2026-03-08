import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyPortalToken } from "@/lib/jobs-portal-auth"

// GET /api/jobs/saved — List saved jobs for a premium subscriber
export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const payload = await verifyPortalToken(token)
  if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

  const savedJobs = await prisma.savedJob.findMany({
    where: { subscriberEmail: payload.email },
    include: {
      jobPosting: {
        select: {
          id: true, slug: true, title: true, company: true, location: true,
          salaryMin: true, salaryMax: true, currency: true, germanLevel: true,
          jobType: true, requirements: true, applyUrl: true, postedAt: true, active: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({
    savedJobs: savedJobs.map((s) => ({
      id: s.id,
      savedAt: s.createdAt.toISOString(),
      job: {
        ...s.jobPosting,
        salaryMin: s.jobPosting.salaryMin ? Number(s.jobPosting.salaryMin) : null,
        salaryMax: s.jobPosting.salaryMax ? Number(s.jobPosting.salaryMax) : null,
        postedAt: s.jobPosting.postedAt?.toISOString() ?? null,
      },
    })),
  })
}

// POST /api/jobs/saved — Save a job
export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const payload = await verifyPortalToken(token)
  if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

  let body: { jobPostingId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.jobPostingId) {
    return NextResponse.json({ error: "jobPostingId required" }, { status: 400 })
  }

  try {
    const saved = await prisma.savedJob.upsert({
      where: {
        subscriberEmail_jobPostingId: {
          subscriberEmail: payload.email,
          jobPostingId: body.jobPostingId,
        },
      },
      create: {
        subscriberEmail: payload.email,
        jobPostingId: body.jobPostingId,
      },
      update: {},
    })

    return NextResponse.json({ saved: { id: saved.id } })
  } catch (error) {
    console.error("[Saved Jobs] Error:", error)
    return NextResponse.json({ error: "Failed to save job" }, { status: 500 })
  }
}
