import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

// POST /api/cron/month-completion - Check for month 1 completions and trigger emails/payouts
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find students who enrolled 30+ days ago and have ≥50% attendance (with email preferences)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const eligibleStudents = await prisma.student.findMany({
      where: {
        enrollmentDate: {
          lte: thirtyDaysAgo,  // Changed from exact to ≤ 30 days ago
        },
        attendanceRate: {
          gte: 50,
        },
        classesAttended: {
          gte: 4,
        },
        completionStatus: "ACTIVE",
        email: {
          not: null,
        },
        emailNotifications: true,  // Check email preferences
      },
      include: {
        referredBy: true,
      },
    })

    const results = []

    for (const student of eligibleStudents) {
      // Calculate which month they just completed
      const daysSinceEnrollment = Math.floor(
        (new Date().getTime() - new Date(student.enrollmentDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
      const monthCompleted = Math.floor(daysSinceEnrollment / 30)

      // Send month completion email (already filtered by preferences in query)
      if (monthCompleted === 1) {
        const result = await sendEmail("month-complete", {
          to: student.email,
          studentName: student.name,
          month: "1",
          attendanceRate: Number(student.attendanceRate).toFixed(0),
          classesAttended: student.classesAttended,
          totalClasses: student.totalClasses,
          currentLevel: student.currentLevel,
          referrerName: student.referredBy?.name || null,
          nextMonthStart: new Date(
            new Date(student.enrollmentDate).setDate(
              new Date(student.enrollmentDate).getDate() + 30
            )
          ).toLocaleDateString(),
        })

        results.push({
          studentId: student.studentId,
          name: student.name,
          email: student.email,
          monthCompleted,
          emailSent: result.success,
        })
      }

      // Update referral status if student was referred
      const referral = await prisma.referral.findFirst({
        where: {
          refereeId: student.id,
          month1Complete: false,
        },
        include: {
          referrer: true,
        },
      })

      if (referral) {
        await prisma.referral.update({
          where: { id: referral.id },
          data: {
            month1Complete: true,
            payoutStatus: "PENDING",
          },
        })

        // Optionally notify admin or referrer
        console.log(
          `Referral month 1 completed: ${referral.referrer.name} → ${student.name}`
        )
      }
    }

    return NextResponse.json({
      success: true,
      completionsProcessed: results.length,
      results,
    })
  } catch (error) {
    console.error("Error processing month completions:", error)
    return NextResponse.json(
      { error: "Failed to process month completions" },
      { status: 500 }
    )
  }
}
