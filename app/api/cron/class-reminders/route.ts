import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendTemplate, WHATSAPP_TEMPLATES } from "@/lib/whatsapp"

/**
 * Cron job to send class reminder WhatsApp messages to students.
 * Schedule: 30 1 * * 1-5 (7 AM IST, Mon-Fri, before morning batch)
 *
 * Sends reminders to all ACTIVE students in RUNNING batches with their
 * Google Meet link for the day.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find all RUNNING batches with their active students
    const batches = await prisma.batch.findMany({
      where: { status: "RUNNING" },
      select: {
        id: true,
        batchCode: true,
        level: true,
        meetLink: true,
        timing: true,
        schedule: true,
        students: {
          where: { completionStatus: "ACTIVE" },
          select: {
            id: true,
            name: true,
            whatsapp: true,
          },
        },
      },
    })

    let sent = 0
    let skipped = 0
    const errors: string[] = []

    for (const batch of batches) {
      if (!batch.students.length) continue

      for (const student of batch.students) {
        if (!student.whatsapp) {
          skipped++
          continue
        }

        const result = await sendTemplate(
          student.whatsapp,
          WHATSAPP_TEMPLATES.CLASS_REMINDER,
          [
            student.name,
            batch.batchCode,
            batch.timing || "scheduled time",
            batch.meetLink || "Check with your teacher",
          ],
          { studentId: student.id }
        )

        if (result.success) {
          sent++
        } else if (result.reason === "not_configured") {
          // WhatsApp not configured — stop processing entirely
          return NextResponse.json({
            success: true,
            message: "WhatsApp not configured. Skipping class reminders.",
            sent: 0,
          })
        } else {
          errors.push(`${student.name}: ${result.reason}`)
        }
      }
    }

    console.log(`📱 Class reminders: ${sent} sent, ${skipped} skipped (no phone)`)

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Class reminders cron error:", error)
    return NextResponse.json(
      { error: "Failed to send class reminders" },
      { status: 500 }
    )
  }
}
