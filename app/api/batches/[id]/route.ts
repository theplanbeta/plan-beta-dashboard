import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail, sendBatchEmails } from "@/lib/email"
import { checkPermission } from "@/lib/api-permissions"
import { z } from "zod"
import { convertAmount, normalizeCurrency, type SupportedCurrency } from "@/lib/currency"

// Helpers to coerce payloads from form values
const nullableString = z.preprocess((v) => (v === "" ? null : v), z.string().nullable().optional())

// Validation schema for updating batch (accepts empty strings as nulls and coerces numbers)
const updateBatchSchema = z.object({
  batchCode: z.string().min(1, "Batch code required"),
  level: z.enum(["NEW", "A1", "A1_HYBRID", "A1_HYBRID_MALAYALAM", "A2", "B1", "B2", "SPOKEN_GERMAN"]),
  currency: z.enum(["EUR", "INR"]).optional(),
  teacherId: nullableString,
  totalSeats: z.preprocess((v) => (typeof v === 'string' ? parseInt(v as string, 10) : v), z.number().int().positive().max(50, "Max 50 seats")),
  revenueTarget: z.preprocess((v) => (typeof v === 'string' ? parseFloat(v as string) : v), z.number().min(0)).optional(),
  teacherCost: z.preprocess((v) => (typeof v === 'string' ? parseFloat(v as string) : v), z.number().min(0)).optional(),
  startDate: nullableString,
  endDate: nullableString,
  schedule: nullableString,
  status: z.enum(["PLANNING", "FILLING", "FULL", "RUNNING", "COMPLETED", "POSTPONED", "CANCELLED"]),
  notes: nullableString,
})

// GET /api/batches/[id] - Get single batch
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const check = await checkPermission("batches", "read")
    if (!check.authorized) return check.response

    const { id } = await params

    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        teacher: true,
        students: {
          include: {
            payments: true,
          },
        },
      },
    })

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    }

    // Calculate stats
    const enrolledCount = batch.students.length
    const fillRate = batch.totalSeats > 0 ? (enrolledCount / batch.totalSeats) * 100 : 0
    const batchCurrency: SupportedCurrency = normalizeCurrency(batch.currency)

    const revenueActual = batch.students.reduce((sum, student) => {
      const paid = Number(student.totalPaid ?? 0)
      const studentCurrency = normalizeCurrency((student as any).currency)
      return sum + convertAmount(paid, studentCurrency, batchCurrency)
    }, 0)

    const revenuePotential = batch.students.reduce((sum, student) => {
      const finalPrice = Number(student.finalPrice ?? 0)
      const studentCurrency = normalizeCurrency((student as any).currency)
      return sum + convertAmount(finalPrice, studentCurrency, batchCurrency)
    }, 0)

    const teacherCost = convertAmount(
      Number(batch.teacherCost ?? 0),
      normalizeCurrency(batch.currency),
      batchCurrency
    )

    const revenueTarget = convertAmount(
      Number(batch.revenueTarget ?? 0),
      normalizeCurrency(batch.currency),
      batchCurrency
    )

    const profit = revenueActual - teacherCost

    return NextResponse.json({
      ...batch,
      currency: batchCurrency,
      enrolledCount,
      fillRate,
      revenueActual,
      revenuePotential,
      revenueTarget,
      teacherCost,
      profit,
    })
  } catch (error) {
    console.error("Error fetching batch:", error)
    return NextResponse.json(
      { error: "Failed to fetch batch" },
      { status: 500 }
    )
  }
}

// PUT /api/batches/[id] - Update batch
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const check = await checkPermission("batches", "update")
    if (!check.authorized) return check.response

    const { id } = await params

    const body = await request.json()

    // Validate request body
    const validation = updateBatchSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    // Get original batch to check for changes
    const originalBatch = await prisma.batch.findUnique({
      where: { id },
      include: {
        students: {
          select: {
            id: true,
            email: true,
            name: true,
            emailNotifications: true,
            emailBatch: true,
          },
        },
      },
    })

    const batch = await prisma.batch.update({
      where: { id },
      data: {
        batchCode: data.batchCode,
        level: data.level,
        currency: data.currency || undefined,
        teacherId: data.teacherId || null,
        totalSeats: data.totalSeats,
        revenueTarget: data.revenueTarget,
        teacherCost: data.teacherCost,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        schedule: data.schedule || null,
        status: data.status,
        notes: data.notes || null,
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        students: {
          select: {
            id: true,
            email: true,
            name: true,
            emailNotifications: true,
            emailBatch: true,
          },
        },
      },
    })

    // Send batch start emails if:
    // 1. Start date is set/changed
    // 2. Status changed to RUNNING
    const startDateChanged =
      data.startDate && originalBatch?.startDate?.getTime() !== new Date(data.startDate).getTime()
    const statusChangedToRunning =
      data.status === "RUNNING" && originalBatch?.status !== "RUNNING"

    if ((startDateChanged || statusChangedToRunning) && batch.students.length > 0) {
      // Send batch start emails to all enrolled students (with email preferences)
      const eligibleStudents = batch.students.filter(
        (s) => s.email && s.emailNotifications && s.emailBatch
      )

      await sendBatchEmails(
        "batch-start",
        eligibleStudents.map((student) => ({
          email: student.email!,
          data: {
            studentName: student.name,
            batchCode: batch.batchCode,
            level: batch.level,
            startDate: batch.startDate?.toLocaleDateString() || "TBD",
            schedule: batch.schedule || "TBD",
            instructor: batch.teacher?.name || "TBD",
            enrolledCount: batch.students.length,
            totalSeats: batch.totalSeats,
          },
        }))
      )
    }

    return NextResponse.json(batch)
  } catch (error) {
    console.error("Error updating batch:", error)
    return NextResponse.json(
      { error: "Failed to update batch" },
      { status: 500 }
    )
  }
}

// DELETE /api/batches/[id] - Delete batch
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const check = await checkPermission("batches", "delete")
    if (!check.authorized) return check.response

    const { id } = await params

    // Check if batch has students
    const batch = await prisma.batch.findUnique({
      where: { id },
      include: { students: true },
    })

    if (batch && batch.students.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete batch with enrolled students" },
        { status: 400 }
      )
    }

    await prisma.batch.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting batch:", error)
    return NextResponse.json(
      { error: "Failed to delete batch" },
      { status: 500 }
    )
  }
}
