import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

// POST /api/cron/teacher-hours-reminder
// Runs at 7 PM CET (18:00 UTC) on weekdays to remind teachers who haven't logged hours TODAY
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    // Debug logging
    console.log("Auth check:", {
      hasAuthHeader: !!authHeader,
      hasCronSecret: !!process.env.CRON_SECRET,
      cronSecretLength: process.env.CRON_SECRET?.length,
      authHeaderLength: authHeader?.length,
    })

    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const dayOfWeek = now.getUTCDay() // 0 = Sunday, 6 = Saturday

    // Skip weekends (classes are Mon-Fri only)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json({
        success: true,
        message: "Skipped - weekend (no classes)",
        remindersSent: 0,
      })
    }

    // Get today's date at midnight UTC for comparison
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    // Find all active teachers with running/filling batches
    const allTeachers = await prisma.user.findMany({
      where: {
        role: "TEACHER",
        active: true,
        batches: {
          some: {
            status: {
              in: ["RUNNING", "FILLING"],
            },
          },
        },
      },
      include: {
        batches: {
          where: {
            status: {
              in: ["RUNNING", "FILLING"],
            },
          },
          select: {
            batchCode: true,
            level: true,
          },
        },
      },
    })

    // Founders/staff who teach but shouldn't receive hour reminders
    const excludedEmails = [
      "aparnasbose1991@gmail.com", // Aparna - founder
    ]

    // Filter teachers with valid email, excluding founders
    const teachers = allTeachers.filter(
      (t) =>
        t.email &&
        t.email.trim().length > 0 &&
        !excludedEmails.includes(t.email.toLowerCase())
    )

    const results = []

    for (const teacher of teachers) {
      // Check if teacher already logged hours for TODAY
      const todayHours = await prisma.teacherHours.findFirst({
        where: {
          teacherId: teacher.id,
          date: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
      })

      // Skip if already logged today
      if (todayHours) {
        results.push({
          teacherId: teacher.id,
          name: teacher.name,
          email: teacher.email,
          skipped: true,
          reason: "Already logged hours today",
        })
        continue
      }

      // Format assigned batches for email
      const assignedBatches = teacher.batches
        .map((b) => `${b.batchCode} (${b.level})`)
        .join(", ")

      // Get today's day name for email
      const dayName = now.toLocaleDateString("en-US", { weekday: "long" })
      const dateStr = now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })

      // Send reminder email
      const result = await sendEmail("teacher-hours-reminder", {
        to: teacher.email,
        teacherName: teacher.name,
        todayDate: `${dayName}, ${dateStr}`,
        assignedBatches: assignedBatches || null,
      })

      results.push({
        teacherId: teacher.id,
        name: teacher.name,
        email: teacher.email,
        batches: teacher.batches.length,
        sent: result.success,
        skipped: false,
      })
    }

    const sentCount = results.filter((r) => r.sent && !r.skipped).length
    const skippedCount = results.filter((r) => r.skipped).length

    return NextResponse.json({
      success: true,
      date: todayStart.toISOString().split("T")[0],
      remindersSent: sentCount,
      alreadyLogged: skippedCount,
      total: teachers.length,
      results,
    })
  } catch (error) {
    console.error("Error sending teacher hours reminders:", error)
    return NextResponse.json(
      { error: "Failed to send teacher hours reminders" },
      { status: 500 }
    )
  }
}

// GET endpoint to check who needs reminders today (for manual testing)
export async function GET() {
  try {
    const now = new Date()
    const dayOfWeek = now.getUTCDay()

    // Check if weekend
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json({
        message: "Weekend - no classes today",
        isWeekend: true,
        teachers: [],
      })
    }

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    const teachers = await prisma.user.findMany({
      where: {
        role: "TEACHER",
        active: true,
        batches: {
          some: {
            status: { in: ["RUNNING", "FILLING"] },
          },
        },
      },
      include: {
        batches: {
          where: { status: { in: ["RUNNING", "FILLING"] } },
          select: { batchCode: true },
        },
      },
    })

    // Founders/staff who teach but shouldn't receive hour reminders
    const excludedEmails = [
      "aparnasbose1991@gmail.com", // Aparna - founder
    ]

    const status = await Promise.all(
      teachers
        .filter(
          (t) =>
            t.email &&
            t.email.trim().length > 0 &&
            !excludedEmails.includes(t.email.toLowerCase())
        )
        .map(async (teacher) => {
          const todayHours = await prisma.teacherHours.findFirst({
            where: {
              teacherId: teacher.id,
              date: { gte: todayStart, lt: todayEnd },
            },
            select: { hoursWorked: true, description: true },
          })

          return {
            name: teacher.name,
            email: teacher.email,
            batches: teacher.batches.map((b) => b.batchCode),
            loggedToday: !!todayHours,
            todayHours: todayHours
              ? {
                  hours: Number(todayHours.hoursWorked),
                  description: todayHours.description.substring(0, 50),
                }
              : null,
            needsReminder: !todayHours,
          }
        })
    )

    return NextResponse.json({
      date: todayStart.toISOString().split("T")[0],
      dayOfWeek: now.toLocaleDateString("en-US", { weekday: "long" }),
      isWeekend: false,
      totalTeachers: status.length,
      loggedToday: status.filter((s) => s.loggedToday).length,
      needingReminder: status.filter((s) => s.needsReminder).length,
      teachers: status,
    })
  } catch (error) {
    console.error("Error checking teacher hours status:", error)
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 })
  }
}
