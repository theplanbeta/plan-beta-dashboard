import { NextRequest, NextResponse } from "next/server"
import { scrapeAllSources } from "@/lib/job-scraper"
import { verifyCronSecret } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"
import { sendText } from "@/lib/whatsapp"

export const maxDuration = 60

// GET /api/cron/job-scraper — Daily job scraping cron (protected by CRON_SECRET)
// Runs at 6 AM UTC daily (configured in vercel.json)
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    console.log("[Cron] Starting daily job scrape...")
    const result = await scrapeAllSources()

    const succeeded = result.results.filter((r) => !r.error)
    const failed = result.results.filter((r) => r.error)

    console.log(
      `[Cron] Job scrape complete: ${result.total} jobs from ${succeeded.length} sources, ${failed.length} failed`
    )

    if (failed.length > 0) {
      console.warn(
        "[Cron] Failed sources:",
        failed.map((f) => `${f.source}: ${f.error}`).join("; ")
      )
    }

    // Check if Kimi Claw has pushed data in the last 36 hours
    await checkKimiClawStaleness()

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[Cron] Job scraper error:", msg)
    return NextResponse.json({ error: `Scraping failed: ${msg}` }, { status: 500 })
  }
}

/**
 * Check if Kimi Claw sources have pushed data recently.
 * If no kimi-claw source has been updated in 36 hours, send a WhatsApp alert.
 */
async function checkKimiClawStaleness() {
  try {
    const kimiSources = await prisma.jobSource.findMany({
      where: {
        active: true,
        name: { contains: "kimi-claw" },
      },
      select: { name: true, lastFetched: true },
    })

    if (kimiSources.length === 0) {
      // No Kimi Claw sources configured yet — skip check
      return
    }

    const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000)
    const allStale = kimiSources.every(
      (s) => !s.lastFetched || s.lastFetched < cutoff
    )

    if (allStale) {
      console.warn("[Cron] Kimi Claw has not pushed data in 36+ hours")
      // Send WhatsApp alert if configured
      const founderPhone = process.env.FOUNDER_WHATSAPP
      if (founderPhone && process.env.WHATSAPP_TOKEN) {
        await sendText(
          founderPhone,
          "⚠️ Kimi Claw hasn't pushed job data in 36+ hours. Check the kimi.ai dashboard."
        ).catch((err) => console.error("[Cron] WhatsApp alert failed:", err))
      }
    }
  } catch (error) {
    // Non-critical — log and continue
    console.error("[Cron] Kimi Claw staleness check failed:", error)
  }
}
