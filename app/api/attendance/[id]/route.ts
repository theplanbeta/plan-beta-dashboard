import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    const attendance = await prisma.attendance.update({
      where: { id },
      data: {
        status: body.status,
        notes: body.notes || null,
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
  })

  const totalClasses = attendanceRecords.length
  const classesAttended = attendanceRecords.filter(
    (record) => record.status === "PRESENT"
  ).length
  const attendanceRate = totalClasses > 0 ? (classesAttended / totalClasses) * 100 : 0

  // Get last class date
  const lastClassDate = attendanceRecords.length > 0
    ? attendanceRecords.sort((a, b) => b.date.getTime() - a.date.getTime())[0].date
    : null

  await prisma.student.update({
    where: { id: studentId },
    data: {
      totalClasses,
      classesAttended,
      attendanceRate,
      lastClassDate,
    },
  })
}
