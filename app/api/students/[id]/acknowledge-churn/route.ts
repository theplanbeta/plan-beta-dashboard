import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"

// POST /api/students/[id]/acknowledge-churn - Mark churn risk as mitigated
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const check = await checkPermission("students", "update")
    if (!check.authorized) return check.response

    const { id } = await params

    // Update student: reset consecutive absences and mark mitigation timestamp
    const student = await prisma.student.update({
      where: { id },
      data: {
        consecutiveAbsences: 0,
        churnMitigatedAt: new Date(),
        churnRisk: "LOW",
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
      message: "Churn risk acknowledged and reset",
      student,
    })
  } catch (error) {
    console.error("Error acknowledging churn:", error)
    return NextResponse.json(
      { error: "Failed to acknowledge churn risk" },
      { status: 500 }
    )
  }
}
