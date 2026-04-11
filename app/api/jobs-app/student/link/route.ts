import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireJobSeeker } from "@/lib/jobs-app-auth"

const linkSchema = z.object({
  studentEmail: z.string().email().optional(),
  studentId: z.string().min(1).optional(),
}).refine(
  (data) => data.studentEmail || data.studentId,
  { message: "Either studentEmail or studentId is required" }
)

/**
 * POST /api/jobs-app/student/link
 *
 * Link a JobSeeker to an existing Plan Beta Student record so they
 * get Pro tier features bundled free with their course enrollment.
 *
 * Security: the Student's email MUST match the seeker's email exactly,
 * otherwise anyone could hijack another student's account.
 */
export async function POST(request: Request) {
  let seeker
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const body = await request.json().catch(() => ({}))
  const parsed = linkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    )
  }

  const { studentEmail, studentId } = parsed.data

  // Look up by studentId first (more specific), then by email
  const student = studentId
    ? await prisma.student.findUnique({ where: { studentId } })
    : await prisma.student.findFirst({
        where: { email: studentEmail?.toLowerCase() },
      })

  if (!student) {
    return NextResponse.json(
      {
        error:
          "No Plan Beta student record found. Please check your student ID or email.",
      },
      { status: 404 }
    )
  }

  // Email hijack prevention — the student's email must match the seeker's
  if (!student.email || student.email.toLowerCase() !== seeker.email.toLowerCase()) {
    return NextResponse.json(
      {
        error:
          "This student record belongs to a different email. Please sign in with the email used for your Plan Beta course.",
      },
      { status: 403 }
    )
  }

  // Already linked?
  if (seeker.planBetaStudentId === student.id) {
    return NextResponse.json({
      student: {
        id: student.id,
        studentId: student.studentId,
        name: student.name,
        currentLevel: student.currentLevel,
      },
      alreadyLinked: true,
    })
  }

  // Link it
  await prisma.jobSeeker.update({
    where: { id: seeker.id },
    data: { planBetaStudentId: student.id },
  })

  return NextResponse.json({
    student: {
      id: student.id,
      studentId: student.studentId,
      name: student.name,
      currentLevel: student.currentLevel,
    },
    linked: true,
  })
}

/**
 * DELETE /api/jobs-app/student/link
 *
 * Unlink the Plan Beta student → seeker falls back to free/paid tier.
 */
export async function DELETE(request: Request) {
  let seeker
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  if (!seeker.planBetaStudentId) {
    return NextResponse.json({ unlinked: true })
  }

  await prisma.jobSeeker.update({
    where: { id: seeker.id },
    data: { planBetaStudentId: null },
  })

  return NextResponse.json({ unlinked: true })
}
