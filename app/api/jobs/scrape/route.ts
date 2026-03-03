import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"
import { scrapeSource, scrapeAllSources } from "@/lib/job-scraper"

// POST /api/jobs/scrape — Authenticated (FOUNDER only), triggers scraping
// Accepts either:
//   { sourceId } — triggers Node.js scraper for that source
//   { sourceId, jobs: [...] } — upserts pre-extracted jobs (from Python script)
//   {} — scrapes all active sources
export async function POST(request: NextRequest) {
  const auth = await checkPermission("jobs", "create")
  if (!auth.authorized) return auth.response

  try {
    const body = await request.json().catch(() => ({}))
    const sourceId = body.sourceId as string | undefined
    const preExtractedJobs = body.jobs as Array<Record<string, unknown>> | undefined

    // Mode 1: Pre-extracted jobs from Python script
    if (sourceId && preExtractedJobs && Array.isArray(preExtractedJobs)) {
      const source = await prisma.jobSource.findUnique({ where: { id: sourceId } })
      if (!source) {
        return NextResponse.json({ error: "Source not found" }, { status: 404 })
      }

      let upsertCount = 0
      for (const job of preExtractedJobs) {
        if (!job.title || !job.company) continue
        try {
          const externalId = (job.externalId as string) || `${sourceId}-${job.title}-${job.company}`.slice(0, 200)
          await prisma.jobPosting.upsert({
            where: { externalId },
            create: {
              sourceId,
              externalId,
              title: String(job.title),
              company: String(job.company),
              location: job.location ? String(job.location) : null,
              salaryMin: typeof job.salaryMin === "number" ? job.salaryMin : null,
              salaryMax: typeof job.salaryMax === "number" ? job.salaryMax : null,
              currency: String(job.currency || "EUR"),
              germanLevel: job.germanLevel ? String(job.germanLevel) : null,
              profession: job.profession ? String(job.profession) : null,
              jobType: job.jobType ? String(job.jobType) : null,
              requirements: Array.isArray(job.requirements) ? job.requirements.map(String) : [],
              applyUrl: job.applyUrl ? String(job.applyUrl) : null,
              postedAt: new Date(),
              active: true,
            },
            update: {
              title: String(job.title),
              company: String(job.company),
              location: job.location ? String(job.location) : null,
              salaryMin: typeof job.salaryMin === "number" ? job.salaryMin : null,
              salaryMax: typeof job.salaryMax === "number" ? job.salaryMax : null,
              germanLevel: job.germanLevel ? String(job.germanLevel) : null,
              profession: job.profession ? String(job.profession) : null,
              jobType: job.jobType ? String(job.jobType) : null,
              requirements: Array.isArray(job.requirements) ? job.requirements.map(String) : [],
              applyUrl: job.applyUrl ? String(job.applyUrl) : null,
              active: true,
              updatedAt: new Date(),
            },
          })
          upsertCount++
        } catch (error) {
          console.error(`[Jobs Scrape] Failed to upsert "${job.title}":`, error)
        }
      }

      await prisma.jobSource.update({
        where: { id: sourceId },
        data: {
          lastFetched: new Date(),
          jobCount: await prisma.jobPosting.count({ where: { sourceId, active: true } }),
        },
      })

      return NextResponse.json({ success: true, count: upsertCount })
    }

    // Mode 2: Node.js scraper for a specific source (JSON API adapters)
    if (sourceId) {
      const result = await scrapeSource(sourceId)
      return NextResponse.json({ success: true, ...result })
    }

    // Mode 3: Scrape all active sources
    const result = await scrapeAllSources()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("[Jobs Scrape] Error:", error)
    return NextResponse.json({ error: "Scraping failed" }, { status: 500 })
  }
}
