import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"

// POST /api/batches/[id]/complete - Mark batch as completed
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const check = await checkPermission("batches", "update")
    if (!check.authorized) return check.response

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const setEndDate = body.setEndDate !== false // Default to true

    // Get the batch
    const batch = await prisma.batch.findUnique({
      where: { id },
      select: { id: true, batchCode: true, status: true, endDate: true },
    })

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    }

    if (batch.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Batch is already completed" },
        { status: 400 }
      )
    }

    // Update batch to completed
    const updatedBatch = await prisma.batch.update({
      where: { id },
      data: {
        status: "COMPLETED",
        endDate: setEndDate ? new Date() : batch.endDate,
      },
      include: {
        teacher: {
          select: { name: true },
        },
        _count: {
          select: { students: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      batch: {
        id: updatedBatch.id,
        batchCode: updatedBatch.batchCode,
        status: updatedBatch.status,
        endDate: updatedBatch.endDate,
        teacherName: updatedBatch.teacher?.name,
        studentCount: updatedBatch._count.students,
      },
    })
  } catch (error) {
    console.error("Error completing batch:", error)
    return NextResponse.json(
      { error: "Failed to complete batch" },
      { status: 500 }
    )
  }
}

// DELETE /api/batches/[id]/complete - Reopen a completed batch (set back to RUNNING)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const check = await checkPermission("batches", "update")
    if (!check.authorized) return check.response

    const { id } = await params

    const batch = await prisma.batch.findUnique({
      where: { id },
      select: { id: true, status: true },
    })

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    }

    if (batch.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Batch is not completed" },
        { status: 400 }
      )
    }

    const updatedBatch = await prisma.batch.update({
      where: { id },
      data: { status: "RUNNING" },
    })

    return NextResponse.json({
      success: true,
      batch: updatedBatch,
    })
  } catch (error) {
    console.error("Error reopening batch:", error)
    return NextResponse.json(
      { error: "Failed to reopen batch" },
      { status: 500 }
    )
  }
}
