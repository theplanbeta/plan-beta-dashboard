import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications"
import { sendTemplate, WHATSAPP_TEMPLATES } from "@/lib/whatsapp"

/**
 * Retention check cron — calculates composite risk score for all active students.
 * Schedule: 0 21 * * * (daily 9 PM UTC)
 *
 * Risk scoring:
 *   attendanceRate < 50% → +40,  < 75% → +20
 *   consecutiveAbsences >= 3 → +30,  >= 2 → +15
 *   paymentStatus OVERDUE → +20,  PARTIAL → +10
 *   daysSinceLastClass > 7 → +10
 *
 *   Score >= 60 → HIGH, 30-59 → MEDIUM, < 30 → LOW
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
        attendanceRate: true,
        consecutiveAbsences: true,
        paymentStatus: true,
        churnRisk: true,
        lastClassDate: true,
        batch: { select: { batchCode: true } },
      },
    })

    let highRisk = 0
    let mediumRisk = 0
    let lowRisk = 0
    let updated = 0

    for (const student of students) {
      let score = 0
      const attendance = Number(student.attendanceRate)

      // Attendance rate
      if (attendance < 50) score += 40
      else if (attendance < 75) score += 20

      // Consecutive absences
      if (student.consecutiveAbsences >= 3) score += 30
      else if (student.consecutiveAbsences >= 2) score += 15

      // Payment status
      if (student.paymentStatus === "OVERDUE") score += 20
      else if (student.paymentStatus === "PARTIAL") score += 10

      // Days since last class
      if (student.lastClassDate) {
        const daysSince = Math.floor(
          (Date.now() - new Date(student.lastClassDate).getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysSince > 7) score += 10
      }

      // Determine risk level
      const riskLevel = score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW"

      // Update if changed
      if (riskLevel !== student.churnRisk) {
        await prisma.student.update({
          where: { id: student.id },
          data: { churnRisk: riskLevel as any },
        })
        updated++
      }

      // Count by level
      if (riskLevel === "HIGH") {
        highRisk++
        // HIGH risk: send WhatsApp outreach + notification
        createNotification({
          type: NOTIFICATION_TYPES.RETENTION_ALERT,
          title: `High risk: ${student.name}`,
          message: `Risk score: ${score} | Attendance: ${attendance}% | Absences: ${student.consecutiveAbsences} | Payment: ${student.paymentStatus}`,
          metadata: { studentId: student.id, riskScore: score },
        })

        if (student.whatsapp) {
          sendTemplate(
            student.whatsapp,
            WHATSAPP_TEMPLATES.RETENTION_OUTREACH,
            [student.name, student.batch?.batchCode || "your course"],
            { studentId: student.id }
          )
        }
      } else if (riskLevel === "MEDIUM") {
        mediumRisk++
        // MEDIUM risk: notification only
        createNotification({
          type: NOTIFICATION_TYPES.RETENTION_ALERT,
          title: `Medium risk: ${student.name}`,
          message: `Risk score: ${score} | Attendance: ${attendance}% | Payment: ${student.paymentStatus}`,
          metadata: { studentId: student.id, riskScore: score },
        })
      } else {
        lowRisk++
      }
    }

    console.log(`🔍 Retention check: ${highRisk} HIGH, ${mediumRisk} MEDIUM, ${lowRisk} LOW | ${updated} updated`)

    return NextResponse.json({
      success: true,
      total: students.length,
      highRisk,
      mediumRisk,
      lowRisk,
      updated,
    })
  } catch (error) {
    console.error("Retention check error:", error)
    return NextResponse.json(
      { error: "Failed to run retention check" },
      { status: 500 }
    )
  }
}
