import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

// POST /api/cron/attendance-alerts - Send attendance alerts to students with low attendance
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find active students with attendance below 50% who have email notifications enabled
    const lowAttendanceStudents = await prisma.student.findMany({
      where: {
        completionStatus: "ACTIVE",
        attendanceRate: {
          lt: 50,
        },
        totalClasses: {
          gte: 4, // At least 4 classes to make the percentage meaningful
        },
        email: {
          not: null,
        },
        emailNotifications: true,
        emailAttendance: true,
      },
    })

    const results = []

    for (const student of lowAttendanceStudents) {
      // Send alert email (already filtered by preferences in query)
      const result = await sendEmail("attendance-alert", {
          to: student.email,
          studentName: student.name,
          attendanceRate: Number(student.attendanceRate).toFixed(0),
          classesAttended: student.classesAttended,
          totalClasses: student.totalClasses,
      })

      results.push({
          studentId: student.studentId,
          name: student.name,
          email: student.email,
          attendanceRate: Number(student.attendanceRate),
          sent: result.success,
      })
    }

    return NextResponse.json({
      success: true,
      alertsSent: results.filter((r) => r.sent).length,
      total: lowAttendanceStudents.length,
      results,
    })
  } catch (error) {
    console.error("Error sending attendance alerts:", error)
    return NextResponse.json(
      { error: "Failed to send attendance alerts" },
      { status: 500 }
    )
  }
}
