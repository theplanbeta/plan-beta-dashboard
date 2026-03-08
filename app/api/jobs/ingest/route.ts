import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { verifyCronSecret } from "@/lib/api-permissions"

const jobSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().nullish(),
  salaryMin: z.number().nullish(),
  salaryMax: z.number().nullish(),
  currency: z.string().default("EUR"),
  germanLevel: z.string().nullish(),
  profession: z.string().nullish(),
  jobType: z.string().nullish(),
  requirements: z.array(z.string()).default([]),
  applyUrl: z.string().url().nullish(),
  externalId: z.string().min(1),
  description: z.string().nullish(),
})

const ingestPayloadSchema = z.object({
  source: z.string().min(1),
  sourceUrl: z.string().url(),
  jobs: z.array(jobSchema).min(1).max(500),
})

// POST /api/jobs/ingest — Receives pushed job data from external scrapers (e.g. Kimi Claw)
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = ingestPayloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { source, sourceUrl, jobs } = parsed.data

  try {
    // Find-or-create JobSource by URL
    const domain = new URL(sourceUrl).hostname.replace(/^www\./, "")
    const sourceName = `${domain} (${source})`

    const jobSource = await prisma.jobSource.upsert({
      where: { name: sourceName },
      create: {
        name: sourceName,
        url: sourceUrl,
        active: true,
      },
      update: {},
    })

    let upsertCount = 0
    for (const job of jobs) {
      try {
        await prisma.jobPosting.upsert({
          where: { externalId: job.externalId },
          create: {
            sourceId: jobSource.id,
            externalId: job.externalId,
            title: job.title,
            company: job.company,
            location: job.location || null,
            description: job.description || null,
            salaryMin: job.salaryMin || null,
            salaryMax: job.salaryMax || null,
            currency: job.currency,
            germanLevel: job.germanLevel || null,
            profession: job.profession || null,
            jobType: job.jobType || null,
            requirements: job.requirements,
            applyUrl: job.applyUrl || null,
            postedAt: new Date(),
            active: true,
          },
          update: {
            title: job.title,
            company: job.company,
            location: job.location || null,
            description: job.description || null,
            salaryMin: job.salaryMin || null,
            salaryMax: job.salaryMax || null,
            germanLevel: job.germanLevel || null,
            profession: job.profession || null,
            jobType: job.jobType || null,
            requirements: job.requirements,
            applyUrl: job.applyUrl || null,
            active: true,
            updatedAt: new Date(),
          },
        })
        upsertCount++
      } catch (error) {
        console.error(`[Ingest] Failed to upsert job "${job.title}":`, error)
      }
    }

    // Update source metadata
    await prisma.jobSource.update({
      where: { id: jobSource.id },
      data: {
        lastFetched: new Date(),
        jobCount: await prisma.jobPosting.count({
          where: { sourceId: jobSource.id, active: true },
        }),
      },
    })

    console.log(`[Ingest] Upserted ${upsertCount}/${jobs.length} jobs from ${sourceName}`)

    return NextResponse.json({
      success: true,
      upserted: upsertCount,
      source: sourceName,
    })
  } catch (error) {
    console.error("[Ingest] Error:", error)
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 })
  }
}
