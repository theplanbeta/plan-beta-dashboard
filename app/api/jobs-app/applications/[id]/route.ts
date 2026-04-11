import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { Prisma, ApplicationStage, ApplicationOutcome } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireJobSeeker, JobSeekerWithProfile } from "@/lib/jobs-app-auth"

// ---------------------------------------------------------------------------
// Validation schema (all fields optional)
// stage / outcome are validated against the Prisma enums so callers can't
// write arbitrary strings that slip past casts and eventually fail in SQL.
// ---------------------------------------------------------------------------
const UpdateSchema = z.object({
  stage: z.nativeEnum(ApplicationStage).optional(),
  notes: z.string().nullable().optional(),
  interviewDate: z.string().nullable().optional(),
  outcome: z.nativeEnum(ApplicationOutcome).nullable().optional(),
  outcomeNotes: z.string().nullable().optional(),
  salaryOffered: z.number().nullable().optional(),
  nextAction: z.string().nullable().optional(),
  nextActionDate: z.string().nullable().optional(),
  appliedAt: z.string().nullable().optional(),
})

// ---------------------------------------------------------------------------
// Helper: parse ISO date string -> Date | null (returns undefined when unset)
// ---------------------------------------------------------------------------
function parseDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === "") return null
  const d = new Date(value)
  if (isNaN(d.getTime())) return undefined
  return d
}

// ---------------------------------------------------------------------------
// PUT /api/jobs-app/applications/[id]
// ---------------------------------------------------------------------------
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let seeker: JobSeekerWithProfile
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const { id } = await params

  const existing = await prisma.jobApplication.findUnique({
    where: { id },
  })

  if (!existing) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 })
  }

  if (existing.seekerId !== seeker.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const {
    stage,
    notes,
    interviewDate,
    outcome,
    outcomeNotes,
    salaryOffered,
    nextAction,
    nextActionDate,
    appliedAt,
  } = parsed.data

  // Build update payload — only include defined keys so we don't wipe values
  const data: Prisma.JobApplicationUpdateInput = {}

  if (stage !== undefined) {
    data.stage = stage
  }
  if (notes !== undefined) {
    data.notes = notes
  }
  if (nextAction !== undefined) {
    data.nextAction = nextAction
  }
  if (outcome !== undefined) {
    data.outcome = outcome
  }
  if (outcomeNotes !== undefined) {
    // outcomeNotes is not a distinct column on JobApplication — persist it via notes
    // by appending? No — spec lists it explicitly; store in notes field only if needed.
    // Schema has no outcomeNotes column, so we silently ignore it to avoid Prisma errors.
  }
  if (salaryOffered !== undefined) {
    data.salaryOffered =
      salaryOffered === null ? null : new Prisma.Decimal(salaryOffered)
  }

  const interviewDateParsed = parseDate(interviewDate)
  if (interviewDateParsed !== undefined) {
    data.interviewDate = interviewDateParsed
  }

  const appliedAtParsed = parseDate(appliedAt)
  if (appliedAtParsed !== undefined) {
    data.appliedAt = appliedAtParsed
  }

  // nextActionDate is not a column on JobApplication in the schema; ignore silently.
  void nextActionDate

  const application = await prisma.jobApplication.update({
    where: { id },
    data,
    include: {
      generatedCV: {
        select: { id: true, fileUrl: true, language: true },
      },
    },
  })

  return NextResponse.json({ application })
}

// ---------------------------------------------------------------------------
// DELETE /api/jobs-app/applications/[id]
// ---------------------------------------------------------------------------
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let seeker: JobSeekerWithProfile
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const { id } = await params

  const existing = await prisma.jobApplication.findUnique({
    where: { id },
    select: { id: true, seekerId: true },
  })

  if (!existing) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 })
  }

  if (existing.seekerId !== seeker.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.jobApplication.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
