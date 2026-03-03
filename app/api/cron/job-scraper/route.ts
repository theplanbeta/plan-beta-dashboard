import { NextRequest, NextResponse } from "next/server"
import { scrapeAllSources } from "@/lib/job-scraper"

// GET /api/cron/job-scraper — Daily job scraping cron (protected by CRON_SECRET)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    console.log("[Cron] Starting daily job scrape...")
    const result = await scrapeAllSources()
    console.log(`[Cron] Job scrape complete: ${result.total} jobs across ${result.results.length} sources`)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("[Cron] Job scraper error:", error)
    return NextResponse.json({ error: "Scraping failed" }, { status: 500 })
  }
}
