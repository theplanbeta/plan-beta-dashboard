import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyCronSecret } from "@/lib/api-permissions"
import { sendTrialDay1Email, sendTrialDay3Email, sendTrialDay4Email } from "@/lib/trial-emails"

export const maxDuration = 30

// GET /api/cron/trial-emails — Send trial lifecycle emails
// Run daily at 9 AM UTC (10 AM CET)
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    console.log("[Cron] Starting trial emails...")

    const now = new Date()
    const results = { day1: 0, day3: 0, day4: 0, errors: 0 }

    // Find all active trial subscribers (status = "active", tier = "premium")
    // We use createdAt to determine which day of trial they're on
    const subscribers = await prisma.jobSubscription.findMany({
      where: {
        status: "active",
        tier: "premium",
      },
      select: {
        email: true,
        name: true,
        createdAt: true,
        // Use metadata JSON to track which trial emails have been sent
        metadata: true,
      },
    })

    for (const sub of subscribers) {
      const daysSinceSignup = Math.floor(
        (now.getTime() - sub.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Parse sent emails from metadata
      const metadata = (sub.metadata as Record<string, unknown>) || {}
      const sentEmails = (metadata.trialEmailsSent as string[]) || []

      let emailSent = false
      let emailDay = ""

      if (daysSinceSignup >= 0 && daysSinceSignup < 1 && !sentEmails.includes("day1")) {
        // Day 0-1: Welcome email
        emailSent = await sendTrialDay1Email(sub.email, sub.name || undefined)
        emailDay = "day1"
      } else if (daysSinceSignup >= 2 && daysSinceSignup < 3 && !sentEmails.includes("day3")) {
        // Day 2-3: Engagement email
        const jobCount = await prisma.jobPosting.count({
          where: { active: true, profession: { in: ["Student Jobs", "Hospitality"] } },
        })
        emailSent = await sendTrialDay3Email(sub.email, sub.name || undefined, jobCount)
        emailDay = "day3"
      } else if (daysSinceSignup >= 3 && daysSinceSignup < 4 && !sentEmails.includes("day4")) {
        // Day 3-4: Trial ending reminder
        emailSent = await sendTrialDay4Email(sub.email, sub.name || undefined)
        emailDay = "day4"
      }

      if (emailSent && emailDay) {
        // Track which emails have been sent
        const updatedSent = [...sentEmails, emailDay]
        await prisma.jobSubscription.update({
          where: { email: sub.email },
          data: {
            metadata: { ...metadata, trialEmailsSent: updatedSent },
          },
        })

        if (emailDay === "day1") results.day1++
        else if (emailDay === "day3") results.day3++
        else if (emailDay === "day4") results.day4++

        console.log(`[Cron] Sent trial ${emailDay} email to ${sub.email}`)
      } else if (emailDay && !emailSent) {
        results.errors++
      }
    }

    console.log(`[Cron] Trial emails done: day1=${results.day1}, day3=${results.day3}, day4=${results.day4}, errors=${results.errors}`)

    return NextResponse.json({ success: true, ...results })
  } catch (error) {
    console.error("[Cron] Trial emails error:", error)
    return NextResponse.json({ error: "Trial emails failed" }, { status: 500 })
  }
}
