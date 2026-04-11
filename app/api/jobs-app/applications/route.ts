import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { Prisma, ApplicationStage } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireJobSeeker, JobSeekerWithProfile } from "@/lib/jobs-app-auth"

// ---------------------------------------------------------------------------
// GET /api/jobs-app/applications
// Returns all applications for the authenticated JobSeeker.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  let seeker: JobSeekerWithProfile
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const applications = await prisma.jobApplication.findMany({
    where: { seekerId: seeker.id },
    orderBy: { updatedAt: "desc" },
    include: {
      generatedCV: {
        select: {
          id: true,
          fileUrl: true,
          language: true,
        },
      },
    },
  })

  return NextResponse.json({ applications })
}

// ---------------------------------------------------------------------------
// POST /api/jobs-app/applications
// Creates (or returns existing) application for a given JobPosting.
// ---------------------------------------------------------------------------
const CreateSchema = z.object({
  jobPostingId: z.string().min(1),
  stage: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  let seeker: JobSeekerWithProfile
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { jobPostingId, stage, notes } = parsed.data

  // Look up the job to denormalize details
  const job = await prisma.jobPosting.findUnique({
    where: { id: jobPostingId },
    select: {
      id: true,
      title: true,
      company: true,
      location: true,
    },
  })

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  // Check existing application (unique constraint [seekerId, jobPostingId])
  const existing = await prisma.jobApplication.findUnique({
    where: {
      seekerId_jobPostingId: {
        seekerId: seeker.id,
        jobPostingId,
      },
    },
    include: {
      generatedCV: {
        select: { id: true, fileUrl: true, language: true },
      },
    },
  })

  if (existing) {
    return NextResponse.json(
      { error: "Application already exists", application: existing },
      { status: 409 }
    )
  }

  const stageValue = (stage as ApplicationStage | undefined) ?? ApplicationStage.SAVED

  const application = await prisma.jobApplication.create({
    data: {
      seekerId: seeker.id,
      jobPostingId: job.id,
      jobTitle: job.title,
      jobCompany: job.company,
      jobLocation: job.location ?? null,
      stage: stageValue,
      notes: notes ?? null,
    },
    include: {
      generatedCV: {
        select: { id: true, fileUrl: true, language: true },
      },
    },
  })

  return NextResponse.json({ application }, { status: 201 })
}
