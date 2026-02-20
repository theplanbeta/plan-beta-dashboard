import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"

// POST /api/students/:id/enroll - Enroll existing student in a new batch
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const check = await checkPermission("students", "update")
    if (!check.authorized) return check.response

    const { id } = await params
    const body = await request.json()
    const { batchId, notes } = body

    if (!batchId) {
      return NextResponse.json(
        { error: "Batch ID is required" },
        { status: 400 }
      )
    }

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id },
      select: { id: true, name: true },
    })

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      )
    }

    // Verify batch exists and is open for enrollment
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { id: true, batchCode: true, level: true, status: true, totalSeats: true },
    })

    if (!batch) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      )
    }

    if (!["PLANNING", "FILLING", "RUNNING"].includes(batch.status)) {
      return NextResponse.json(
        { error: `Batch ${batch.batchCode} is ${batch.status} and not accepting enrollments` },
        { status: 400 }
      )
    }

    // Check for duplicate enrollment
    const existingEnrollment = await prisma.batchEnrollment.findUnique({
      where: {
        studentId_batchId: { studentId: id, batchId },
      },
    })

    if (existingEnrollment) {
      return NextResponse.json(
        { error: `${student.name} is already enrolled in ${batch.batchCode}` },
        { status: 409 }
      )
    }

    // Create enrollment and update student's primary batch in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const enrollment = await tx.batchEnrollment.create({
        data: {
          studentId: id,
          batchId,
          notes: notes || null,
        },
        include: {
          batch: {
            select: { id: true, batchCode: true, level: true },
          },
        },
      })

      // Update student's primary batch and current level
      await tx.student.update({
        where: { id },
        data: {
          batchId,
          currentLevel: batch.level,
        },
      })

      return enrollment
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("Error enrolling student in batch:", error)
    return NextResponse.json(
      { error: "Failed to enroll student in batch" },
      { status: 500 }
    )
  }
}
