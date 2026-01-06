import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

/**
 * POST /api/cron/daily-absence-notice
 *
 * Sends an email notification to students who were marked ABSENT today.
 * The email reminds them of their responsibility to watch the recording
 * and clarifies the refund policy regarding missed classes.
 *
 * Should run after classes end (e.g., 9 PM CET / 8 PM UTC)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const dayOfWeek = now.getUTCDay() // 0 = Sunday, 6 = Saturday

    // Skip weekends (classes are Mon-Fri only)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json({
        success: true,
        message: "Skipped - weekend (no classes)",
        noticesSent: 0,
      })
    }

    // Get today's date at midnight UTC for comparison
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    // Find all attendance records marked as ABSENT today
    const absentRecords = await prisma.attendance.findMany({
      where: {
        date: {
          gte: todayStart,
          lt: todayEnd,
        },
        status: "ABSENT",
      },
      include: {
        student: {
          include: {
            batch: {
              select: {
                id: true,
                batchCode: true,
                level: true,
                teacher: {
                  select: {
                    name: true,
                    whatsapp: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    // FAILSAFE: Check which batches actually had attendance marked today
    // If a batch has no attendance records at all, teacher likely forgot - don't send emails
    const batchesWithAttendance = await prisma.attendance.groupBy({
      by: ["studentId"],
      where: {
        date: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    })

    // Get unique batch IDs that had attendance marked
    const studentsWithAttendance = new Set(batchesWithAttendance.map((a) => a.studentId))

    // Get all batch IDs from absent students and check if their batch had attendance marked
    const batchAttendanceCounts = new Map<string, { present: number; absent: number }>()

    for (const record of absentRecords) {
      const batchId = record.student.batch?.id
      if (!batchId) continue

      if (!batchAttendanceCounts.has(batchId)) {
        // Count how many students in this batch had attendance marked today
        const batchAttendance = await prisma.attendance.findMany({
          where: {
            date: {
              gte: todayStart,
              lt: todayEnd,
            },
            student: {
              batchId: batchId,
            },
          },
        })
        batchAttendanceCounts.set(batchId, {
          present: batchAttendance.filter((a) => a.status === "PRESENT").length,
          absent: batchAttendance.filter((a) => a.status === "ABSENT").length,
        })
      }
    }

    // Filter out students whose batch might not have proper attendance marked
    // A batch should have at least 1 student marked present to consider attendance was properly taken
    const validAbsentRecords = absentRecords.filter((record) => {
      const batchId = record.student.batch?.id
      if (!batchId) return false

      const counts = batchAttendanceCounts.get(batchId)
      // Only send if at least 1 student was marked present (teacher actually took attendance)
      return counts && counts.present >= 1
    })

    // Filter students who have email and have email notifications enabled
    const studentsToNotify = validAbsentRecords.filter(
      (record) =>
        record.student.email &&
        record.student.email.trim().length > 0 &&
        record.student.emailNotifications !== false &&
        record.student.emailAttendance !== false &&
        record.student.completionStatus === "ACTIVE"
    )

    const results = []
    const dateStr = todayStart.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })

    for (const record of studentsToNotify) {
      const student = record.student
      const teacher = student.batch?.teacher
      const teacherContact = teacher?.whatsapp || teacher?.phone || null

      const result = await sendEmail("student-absence-notice", {
        to: student.email!,
        studentName: student.name,
        classDate: dateStr,
        batchCode: student.batch?.batchCode || "Your batch",
        level: student.batch?.level || "German",
        teacherName: teacher?.name || null,
        teacherWhatsapp: teacherContact,
      })

      results.push({
        studentId: student.id,
        name: student.name,
        email: student.email,
        batchCode: student.batch?.batchCode,
        teacherName: teacher?.name,
        sent: result.success,
        error: result.success ? null : String(result.error),
      })
    }

    const sentCount = results.filter((r) => r.sent).length
    const failedCount = results.filter((r) => !r.sent).length
    const skippedDueToNoAttendance = absentRecords.length - validAbsentRecords.length

    return NextResponse.json({
      success: true,
      date: todayStart.toISOString().split("T")[0],
      totalAbsent: absentRecords.length,
      skippedNoAttendanceMarked: skippedDueToNoAttendance,
      validAbsences: validAbsentRecords.length,
      eligibleForNotice: studentsToNotify.length,
      noticesSent: sentCount,
      failed: failedCount,
      results,
    })
  } catch (error) {
    console.error("Error sending daily absence notices:", error)
    return NextResponse.json(
      { error: "Failed to send daily absence notices" },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check today's absences (for manual testing)
 */
export async function GET(request: NextRequest) {
  try {
    // Allow GET without auth for testing, but only return summary
    const now = new Date()
    const dayOfWeek = now.getUTCDay()

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json({
        message: "Weekend - no classes today",
        isWeekend: true,
        absences: [],
      })
    }

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    const absentRecords = await prisma.attendance.findMany({
      where: {
        date: {
          gte: todayStart,
          lt: todayEnd,
        },
        status: "ABSENT",
      },
      include: {
        student: {
          select: {
            name: true,
            email: true,
            emailNotifications: true,
            emailAttendance: true,
            completionStatus: true,
            batch: {
              select: {
                batchCode: true,
                level: true,
              },
            },
          },
        },
      },
    })

    const summary = absentRecords.map((record) => ({
      studentName: record.student.name,
      email: record.student.email,
      batchCode: record.student.batch?.batchCode,
      level: record.student.batch?.level,
      emailEnabled:
        record.student.emailNotifications !== false &&
        record.student.emailAttendance !== false,
      isActive: record.student.completionStatus === "ACTIVE",
      willReceiveNotice:
        !!record.student.email &&
        record.student.emailNotifications !== false &&
        record.student.emailAttendance !== false &&
        record.student.completionStatus === "ACTIVE",
    }))

    const eligibleCount = summary.filter((s) => s.willReceiveNotice).length

    return NextResponse.json({
      date: todayStart.toISOString().split("T")[0],
      dayOfWeek: now.toLocaleDateString("en-US", { weekday: "long" }),
      isWeekend: false,
      totalAbsent: absentRecords.length,
      eligibleForNotice: eligibleCount,
      absences: summary,
    })
  } catch (error) {
    console.error("Error checking daily absences:", error)
    return NextResponse.json({ error: "Failed to check absences" }, { status: 500 })
  }
}
