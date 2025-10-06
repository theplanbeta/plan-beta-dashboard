import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"

// GET /api/attendance - List attendance records
export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("attendance", "read")
    if (!check.authorized) return check.response

    const { user } = check.session

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const batchId = searchParams.get("batchId")
    const date = searchParams.get("date")
    const status = searchParams.get("status")

    const where: Record<string, unknown> = {}

    if (studentId) {
      where.studentId = studentId
    }

    if (batchId) {
      where.student = {
        batchId: batchId,
      }
    }

    if (date) {
      const targetDate = new Date(date)
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))

      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      }
    }

    if (status) {
      where.status = status
    }

    // For TEACHER role, only show attendance for their batches
    if (user.role === "TEACHER") {
      where.student = {
        ...((where.student as Record<string, unknown>) || {}),
        batch: { teacherId: user.id },
      }
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            name: true,
            currentLevel: true,
            batch: {
              select: {
                id: true,
                batchCode: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    })

    return NextResponse.json(attendance)
  } catch (error) {
    console.error("Error fetching attendance:", error)
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
      { status: 500 }
    )
  }
}

// POST /api/attendance - Mark attendance
export async function POST(request: NextRequest) {
  try {
    const check = await checkPermission("attendance", "create")
    if (!check.authorized) return check.response

    const body = await request.json()

    // Support both single and bulk attendance marking
    if (Array.isArray(body)) {
      // Bulk attendance marking
      const attendanceRecords = await prisma.$transaction(
        body.map((record) =>
          prisma.attendance.upsert({
            where: {
              studentId_date: {
                studentId: record.studentId,
                date: new Date(record.date),
              },
            },
            update: {
              status: record.status,
              notes: record.notes || null,
            },
            create: {
              studentId: record.studentId,
              date: new Date(record.date),
              status: record.status,
              notes: record.notes || null,
            },
          })
        )
      )

      // Update student attendance stats
      for (const record of body) {
        await updateStudentAttendance(record.studentId)
      }

      return NextResponse.json(attendanceRecords, { status: 201 })
    } else {
      // Single attendance marking
      const attendance = await prisma.attendance.upsert({
        where: {
          studentId_date: {
            studentId: body.studentId,
            date: new Date(body.date),
          },
        },
        update: {
          status: body.status,
          notes: body.notes || null,
        },
        create: {
          studentId: body.studentId,
          date: new Date(body.date),
          status: body.status,
          notes: body.notes || null,
        },
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              name: true,
            },
          },
        },
      })

      // Update student attendance stats
      await updateStudentAttendance(body.studentId)

      return NextResponse.json(attendance, { status: 201 })
    }
  } catch (error) {
    console.error("Error marking attendance:", error)
    return NextResponse.json(
      { error: "Failed to mark attendance" },
      { status: 500 }
    )
  }
}

// Helper function to update student attendance stats
async function updateStudentAttendance(studentId: string) {
  const attendanceRecords = await prisma.attendance.findMany({
    where: { studentId },
  })

  const totalClasses = attendanceRecords.length
  const classesAttended = attendanceRecords.filter(
    (record) => record.status === "PRESENT" || record.status === "LATE"
  ).length
  const attendanceRate = totalClasses > 0 ? (classesAttended / totalClasses) * 100 : 0

  // Get last class date
  const lastClassDate = attendanceRecords.length > 0
    ? attendanceRecords.sort((a, b) => b.date.getTime() - a.date.getTime())[0].date
    : null

  // Calculate churn risk based on attendance and payment status
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { paymentStatus: true },
  })

  let churnRisk: "LOW" | "MEDIUM" | "HIGH" = "LOW"

  if (attendanceRate < 50) {
    churnRisk = "HIGH"
  } else if (attendanceRate < 75 && student?.paymentStatus === "OVERDUE") {
    churnRisk = "MEDIUM"
  } else if (attendanceRate < 75) {
    churnRisk = "MEDIUM"
  }

  await prisma.student.update({
    where: { id: studentId },
    data: {
      totalClasses,
      classesAttended,
      attendanceRate,
      lastClassDate,
      churnRisk,
    },
  })
}
