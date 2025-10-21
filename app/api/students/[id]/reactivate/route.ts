import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"

// POST /api/students/[id]/reactivate - Reactivate a suspended student
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const check = await checkPermission("students", "update")
    if (!check.authorized) return check.response

    const { id } = await params

    // Update student: reactivate
    const student = await prisma.student.update({
      where: { id },
      data: {
        completionStatus: "ACTIVE",
        suspendedAt: null,
        suspensionReason: null,
        // Note: We don't automatically restore previousBatchId
        // They need to be manually added to a new batch
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
      message: "Student reactivated successfully",
      student,
    })
  } catch (error) {
    console.error("Error reactivating student:", error)
    return NextResponse.json(
      { error: "Failed to reactivate student" },
      { status: 500 }
    )
  }
}
