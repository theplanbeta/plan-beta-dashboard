import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"

// POST /api/students/[id]/suspend - Suspend a student
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const check = await checkPermission("students", "update")
    if (!check.authorized) return check.response

    const { id } = await params
    const body = await request.json()
    const { reason } = body

    // Get current student data
    const currentStudent = await prisma.student.findUnique({
      where: { id },
      select: { batchId: true },
    })

    if (!currentStudent) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      )
    }

    // Update student: suspend and remove from batch
    const student = await prisma.student.update({
      where: { id },
      data: {
        completionStatus: "SUSPENDED",
        suspendedAt: new Date(),
        suspensionReason: reason || null,
        previousBatchId: currentStudent.batchId || null,
        batchId: null, // Remove from current batch
      },
      include: {
        batch: {
          select: {
            id: true,
            batchCode: true,
            level: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: "Student suspended successfully",
      student,
    })
  } catch (error) {
    console.error("Error suspending student:", error)
    return NextResponse.json(
      { error: "Failed to suspend student" },
      { status: 500 }
    )
  }
}
