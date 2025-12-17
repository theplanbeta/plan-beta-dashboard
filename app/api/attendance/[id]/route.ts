import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateAttendanceSchema = z.object({
  status: z.enum(["PRESENT", "ABSENT", "EXCUSED", "LATE"], {
    message: "Status must be one of: PRESENT, ABSENT, EXCUSED, LATE",
  }),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional().nullable(),
})

// GET /api/attendance/[id] - Get single attendance record
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            name: true,
            batch: {
              select: {
                id: true,
                batchCode: true,
              },
            },
          },
        },
      },
    })

    if (!attendance) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 })
    }

    return NextResponse.json(attendance)
  } catch (error) {
    console.error("Error fetching attendance:", error)
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
      { status: 500 }
    )
  }
}

// PUT /api/attendance/[id] - Update attendance record
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const body = await request.json()

    // Validate input
    const validation = updateAttendanceSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid attendance data", details: validation.error.issues },
        { status: 400 }
      )
    }

    const { status, notes } = validation.data

    const attendance = await prisma.attendance.update({
      where: { id },
      data: {
        status,
        notes: notes || null,
      },
      include: {
        student: true,
      },
    })

    // Update student attendance stats
    await updateStudentAttendance(attendance.studentId)

    return NextResponse.json(attendance)
  } catch (error) {
    console.error("Error updating attendance:", error)
    return NextResponse.json(
      { error: "Failed to update attendance" },
      { status: 500 }
    )
  }
}

// DELETE /api/attendance/[id] - Delete attendance record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const attendance = await prisma.attendance.findUnique({
      where: { id },
    })

    if (!attendance) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 })
    }

    await prisma.attendance.delete({
      where: { id },
    })

    // Update student attendance stats
    await updateStudentAttendance(attendance.studentId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting attendance:", error)
    return NextResponse.json(
      { error: "Failed to delete attendance" },
      { status: 500 }
    )
  }
}

// Helper function to update student attendance stats
async function updateStudentAttendance(studentId: string) {
  const attendanceRecords = await prisma.attendance.findMany({
    where: { studentId },
    orderBy: { date: 'desc' },
  })

  const totalClasses = attendanceRecords.length
  const classesAttended = attendanceRecords.filter(
    (record) => record.status === "PRESENT" || record.status === "LATE"
  ).length
  const attendanceRate = totalClasses > 0 ? (classesAttended / totalClasses) * 100 : 0

  // Get last class date
  const lastClassDate = attendanceRecords.length > 0
    ? attendanceRecords[0].date
    : null

  // Calculate consecutive absences (from most recent)
  let consecutiveAbsences = 0
  let lastAbsenceDate: Date | null = null

  for (const record of attendanceRecords) {
    if (record.status === "ABSENT") {
      consecutiveAbsences++
      if (!lastAbsenceDate) {
        lastAbsenceDate = record.date
      }
    } else {
      // Stop counting when we hit a non-absent record
      break
    }
  }

  // Calculate churn risk
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { paymentStatus: true },
  })

  let churnRisk: "LOW" | "MEDIUM" | "HIGH" = "LOW"

  if (attendanceRate < 50 || consecutiveAbsences >= 3) {
    churnRisk = "HIGH"
  } else if (attendanceRate < 75 && student?.paymentStatus === "OVERDUE") {
    churnRisk = "MEDIUM"
  } else if (attendanceRate < 75 || consecutiveAbsences >= 2) {
    churnRisk = "MEDIUM"
  }

  await prisma.student.update({
    where: { id: studentId },
    data: {
      totalClasses,
      classesAttended,
      attendanceRate,
      lastClassDate,
      consecutiveAbsences,
      lastAbsenceDate,
      churnRisk,
    },
  })
}
