import { NextRequest, NextResponse } from "next/server"
import { scrapeAllSources } from "@/lib/job-scraper"
import { verifyCronSecret } from "@/lib/api-permissions"

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
