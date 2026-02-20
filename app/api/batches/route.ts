import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"
import { z } from "zod"
import { Prisma } from "@prisma/client"

const Decimal = Prisma.Decimal

// Validation schema for creating a batch
const createBatchSchema = z.object({
  batchCode: z.string().min(3, "Batch code too short").max(50, "Batch code too long"),
  level: z.enum(["NEW", "A1", "A1_HYBRID", "A1_HYBRID_MALAYALAM", "A2", "B1", "B2", "SPOKEN_GERMAN"]),
  currency: z.enum(["EUR", "INR"]).optional(),
  teacherId: z.string().optional(),
  totalSeats: z.number().int().positive("Total seats must be positive").max(9999, "Too many seats"),
  revenueTarget: z.number().min(0, "Revenue target cannot be negative").max(10000000, "Revenue target too high"),
  teacherCost: z.number().min(0, "Teacher cost cannot be negative").max(1000000, "Teacher cost too high"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  schedule: z.string().max(500, "Schedule too long").optional(),
  status: z.enum(["PLANNING", "FILLING", "FULL", "RUNNING", "COMPLETED"]).optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
})

// GET /api/batches - List all batches
export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("batches", "read")
    if (!check.authorized) return check.response

    const { user } = check.session

    const { searchParams } = new URL(request.url)
    const level = searchParams.get("level")
    const status = searchParams.get("status")

    const where: Record<string, unknown> = {}

    if (level) {
      where.level = level
    }

    if (status) {
      where.status = status
    }

    // For TEACHER role, filter batches to only show those assigned to the teacher
    if (user.role === "TEACHER") {
      where.teacherId = user.id
    }

    const batches = await prisma.batch.findMany({
      where,
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
            name: true,
            currentLevel: true,
            paymentStatus: true,
          },
        },
        enrollments: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            studentId: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Calculate fill rate: union of students (batchId FK) + enrollments (multi-batch)
    const batchesWithStats = batches.map((batch) => {
      const uniqueStudentIds = new Set([
        ...batch.students.map((s) => s.id),
        ...batch.enrollments.map((e) => e.studentId),
      ])
      const count = uniqueStudentIds.size
      return {
        ...batch,
        enrolledCount: count,
        fillRate: batch.totalSeats > 0 ? (count / batch.totalSeats) * 100 : 0,
      }
    })

    return NextResponse.json(batchesWithStats)
  } catch (error) {
    console.error("Error fetching batches:", error)
    return NextResponse.json(
      { error: "Failed to fetch batches" },
      { status: 500 }
    )
  }
}

// POST /api/batches - Create a new batch
export async function POST(request: NextRequest) {
  try {
    const check = await checkPermission("batches", "create")
    if (!check.authorized) return check.response

    const body = await request.json()

    // Validate request body
    const validation = createBatchSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    // Use Decimal for financial values
    const revenueTarget = new Decimal(data.revenueTarget.toString())
    const teacherCost = new Decimal(data.teacherCost.toString())

    const batch = await prisma.batch.create({
      data: {
        batchCode: data.batchCode,
        level: data.level,
        currency: data.currency || "EUR",
        teacherId: data.teacherId || null,
        totalSeats: data.totalSeats,
        enrolledCount: 0,
        fillRate: 0,
        revenueTarget,
        revenueActual: new Decimal(0),
        teacherCost,
        profit: new Decimal(0),
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        schedule: data.schedule || null,
        status: data.status || "PLANNING",
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
      },
    })

    return NextResponse.json(batch, { status: 201 })
  } catch (error) {
    console.error("Error creating batch:", error)
    return NextResponse.json(
      { error: "Failed to create batch" },
      { status: 500 }
    )
  }
}
