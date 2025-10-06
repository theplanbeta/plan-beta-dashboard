import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

// POST /api/cron/payment-reminders - Send payment reminders to students with overdue balances
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find students with overdue payments who have email notifications enabled
    const overdueStudents = await prisma.student.findMany({
      where: {
        paymentStatus: "OVERDUE",
        balance: {
          gt: 0,
        },
        email: {
          not: null,
        },
        emailNotifications: true,
        emailPayment: true,
      },
    })

    const results = []

    for (const student of overdueStudents) {
      // Calculate days overdue
      const daysSinceEnrollment = Math.floor(
        (new Date().getTime() - new Date(student.enrollmentDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
      const daysOverdue = Math.max(0, daysSinceEnrollment - 30)

      // Send reminder email (already filtered by preferences in query)
      const result = await sendEmail("payment-reminder", {
          to: student.email,
          studentName: student.name,
          balance: Number(student.balance).toFixed(2),
          originalPrice: Number(student.originalPrice).toFixed(2),
          totalPaid: Number(student.totalPaid).toFixed(2),
          daysOverdue,
      })

      results.push({
          studentId: student.studentId,
          name: student.name,
          email: student.email,
          balance: Number(student.balance),
          sent: result.success,
      })
    }

    return NextResponse.json({
      success: true,
      remindersSent: results.filter((r) => r.sent).length,
      total: overdueStudents.length,
      results,
    })
  } catch (error) {
    console.error("Error sending payment reminders:", error)
    return NextResponse.json(
      { error: "Failed to send payment reminders" },
      { status: 500 }
    )
  }
}
