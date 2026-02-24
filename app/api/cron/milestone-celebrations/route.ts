import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendTemplate, WHATSAPP_TEMPLATES } from "@/lib/whatsapp"
import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications"

const MILESTONES = [10, 25, 50, 75, 100]

/**
 * Milestone celebrations cron — sends congratulations for class attendance milestones.
 * Schedule: 0 8 * * * (daily 8 AM UTC)
 *
 * Checks:
 *   - 10, 25, 50, 75, 100 classes attended
 *   - 90%+ attendance for 30+ days
 *   - Payment complete
 *
 * Tracks sent celebrations via WhatsAppMessage log to avoid duplicates.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const students = await prisma.student.findMany({
      where: { completionStatus: "ACTIVE" },
      select: {
        id: true,
        name: true,
        whatsapp: true,
        classesAttended: true,
        attendanceRate: true,
        paymentStatus: true,
        batch: { select: { batchCode: true, level: true } },
      },
    })

    let celebrated = 0

    for (const student of students) {
      // Check class attendance milestones
      for (const milestone of MILESTONES) {
        if (student.classesAttended !== milestone) continue

        // Check if already celebrated this milestone
        const alreadySent = await prisma.whatsAppMessage.findFirst({
          where: {
            studentId: student.id,
            templateName: WHATSAPP_TEMPLATES.MILESTONE_CELEBRATION,
            metadata: { path: ["milestone"], equals: milestone },
          },
        })
        if (alreadySent) continue

        if (student.whatsapp) {
          sendTemplate(
            student.whatsapp,
            WHATSAPP_TEMPLATES.MILESTONE_CELEBRATION,
            [student.name, String(milestone), student.batch?.level || "German"],
            {
              studentId: student.id,
              metadata: { milestone, type: "class_count" },
            }
          )
        }

        createNotification({
          type: NOTIFICATION_TYPES.MILESTONE,
          title: `${student.name} reached ${milestone} classes!`,
          message: `${student.name} from ${student.batch?.batchCode || "unknown batch"} has attended ${milestone} classes.`,
          metadata: { studentId: student.id, milestone },
        })

        celebrated++
      }

      // Check 90%+ attendance sustained for active students with 30+ classes
      if (
        Number(student.attendanceRate) >= 90 &&
        student.classesAttended >= 30
      ) {
        const alreadySent = await prisma.whatsAppMessage.findFirst({
          where: {
            studentId: student.id,
            templateName: WHATSAPP_TEMPLATES.MILESTONE_CELEBRATION,
            metadata: { path: ["type"], equals: "high_attendance" },
          },
        })
        if (alreadySent) continue

        if (student.whatsapp) {
          sendTemplate(
            student.whatsapp,
            WHATSAPP_TEMPLATES.MILESTONE_CELEBRATION,
            [student.name, `${Number(student.attendanceRate).toFixed(0)}%`, "attendance"],
            {
              studentId: student.id,
              metadata: { type: "high_attendance", rate: Number(student.attendanceRate) },
            }
          )
        }

        celebrated++
      }
    }

    console.log(`🎉 Milestone celebrations: ${celebrated} sent`)

    return NextResponse.json({
      success: true,
      studentsChecked: students.length,
      celebrated,
    })
  } catch (error) {
    console.error("Milestone celebrations error:", error)
    return NextResponse.json(
      { error: "Failed to run milestone celebrations" },
      { status: 500 }
    )
  }
}
