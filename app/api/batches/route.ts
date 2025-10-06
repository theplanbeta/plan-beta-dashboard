import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"

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
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Calculate fill rate and revenue for each batch
    const batchesWithStats = batches.map((batch) => ({
      ...batch,
      enrolledCount: batch.students.length,
      fillRate: batch.totalSeats > 0 ? (batch.students.length / batch.totalSeats) * 100 : 0,
    }))

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

    const batch = await prisma.batch.create({
      data: {
        batchCode: body.batchCode,
        level: body.level,
        teacherId: body.teacherId || null,
        totalSeats: body.totalSeats,
        enrolledCount: 0,
        fillRate: 0,
        revenueTarget: body.revenueTarget,
        revenueActual: 0,
        teacherCost: body.teacherCost,
        profit: 0,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        schedule: body.schedule || null,
        status: body.status || "PLANNING",
        notes: body.notes || null,
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
