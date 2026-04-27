import { NextRequest, NextResponse } from "next/server"
import { generateJobSlug, scrapeArbeitsagenturKeyword } from "@/lib/job-scraper"
import { verifyCronSecret } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"
import { sendText } from "@/lib/whatsapp"
import { nextChunk, KEYWORD_CHUNK_SIZE } from "@/lib/job-source-config"

export const maxDuration = 300

// GET /api/cron/job-scraper — hourly chunked Arbeitsagentur keyword rotation.
// Each run advances a Postgres-backed cursor so we cycle through ~25 keywords
// over ~6 hours instead of slamming a single keyword per call.
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const state = await prisma.jobScrapeState.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", keywordCursor: 0 },
      update: {},
    })

    const { keywords, nextCursor } = nextChunk(state.keywordCursor)

    console.log(
      `[Cron] Scraping keywords [${keywords.join(", ")}] (cursor ${state.keywordCursor} → ${nextCursor})`
    )

    const results = await Promise.all(
      keywords.map((kw) => scrapeArbeitsagenturKeyword(kw))
    )

    await prisma.jobScrapeState.update({
      where: { id: "singleton" },
      data: { keywordCursor: nextCursor },
    })

    const totalUpserted = results.reduce((acc, r) => acc + r.upserted, 0)
    const failed = results.filter((r) => r.error)

    if (failed.length > 0) {
      console.warn(
        "[Cron] Failed keywords:",
        failed.map((f) => `${f.keyword}: ${f.error}`).join("; ")
      )
    }

    const slugsBackfilled = await backfillSlugs()
    await checkKimiClawStaleness()

    return NextResponse.json({
      success: true,
      keywords,
      nextCursor,
      chunkSize: KEYWORD_CHUNK_SIZE,
      totalUpserted,
      results,
      slugsBackfilled,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[Cron] Job scraper error:", msg)
    return NextResponse.json({ error: `Scraping failed: ${msg}` }, { status: 500 })
  }
}

async function backfillSlugs(): Promise<number> {
  try {
    const jobsWithoutSlug = await prisma.jobPosting.findMany({
      where: { slug: null },
      select: { id: true, externalId: true, title: true, company: true, location: true },
      take: 200,
    })
    if (jobsWithoutSlug.length === 0) return 0
    let updated = 0
    for (const job of jobsWithoutSlug) {
      try {
        const slug = generateJobSlug(job.title, job.company, job.location)
        const existing = await prisma.jobPosting.findUnique({
          where: { slug },
          select: { id: true },
        })
        const finalSlug = existing && existing.id !== job.id
          ? `${slug}-${(job.externalId || job.id).slice(-6)}`
          : slug
        await prisma.jobPosting.update({
          where: { id: job.id },
          data: { slug: finalSlug },
        })
        updated++
      } catch (error) {
        console.error(`[Cron] Failed to backfill slug for job ${job.id}:`, error)
      }
    }
    console.log(`[Cron] Backfilled slugs for ${updated}/${jobsWithoutSlug.length} jobs`)
    return updated
  } catch (error) {
    console.error("[Cron] Slug backfill failed:", error)
    return 0
  }
}

async function checkKimiClawStaleness() {
  try {
    const kimiSources = await prisma.jobSource.findMany({
      where: { active: true, isPushSource: true },
      select: { name: true, lastFetched: true },
    })
    if (kimiSources.length === 0) return
    const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000)
    const allStale = kimiSources.every(
      (s) => !s.lastFetched || s.lastFetched < cutoff
    )
    if (allStale) {
      console.warn("[Cron] Kimi Claw has not pushed data in 36+ hours")
      const founderPhone = process.env.FOUNDER_WHATSAPP
      if (founderPhone && process.env.WHATSAPP_TOKEN) {
        await sendText(
          founderPhone,
          "⚠️ Kimi Claw hasn't pushed job data in 36+ hours. Check the kimi.ai dashboard."
        ).catch((err) => console.error("[Cron] WhatsApp alert failed:", err))
      }
    }
  } catch (error) {
    console.error("[Cron] Kimi Claw staleness check failed:", error)
  }
}
