import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { verifyCronSecret } from "@/lib/api-permissions"
import { generateJobSlug, inferProfession, cleanJobTitle } from "@/lib/job-scraper"

const jobSchema = z.object({
  title: z.string().min(1).max(200),
  company: z.string().min(1).max(100),
  location: z.string().max(50).nullish(),
  salaryMin: z.number().nullish(),
  salaryMax: z.number().nullish(),
  currency: z.string().default("EUR"),
  germanLevel: z.string().nullish(),
  profession: z.string().nullish(),
  jobType: z.string().nullish(),
  requirements: z.array(z.string()).default([]),
  applyUrl: z.string().max(500).nullish(),
  externalId: z.string().min(1).max(100),
  description: z.string().max(500).nullish(),
  grade: z.enum(["A", "B", "C", "D"]).nullish(),
  gradeReason: z.string().max(200).nullish(),
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

    // Detect generic career page URLs
    const GENERIC_CAREER_PATTERNS = /\/(jobs\.html|karriere\/?|career\/?|careers\/?|stellenangebote\/?|jobs\/?)$/i

    let upsertCount = 0
    let genericUrlCount = 0
    for (const job of jobs) {
      try {
        // Warn if applyUrl matches source URL or looks like a generic career page
        if (job.applyUrl) {
          const isGeneric = job.applyUrl === sourceUrl || GENERIC_CAREER_PATTERNS.test(job.applyUrl)
          if (isGeneric) {
            genericUrlCount++
            console.warn(`[Ingest] Generic career URL for "${job.title}" at ${job.company}: ${job.applyUrl}`)
          }
        }

        // Infer profession if missing or "Other"
        const profession = (!job.profession || job.profession === "Other")
          ? inferProfession(job.requirements || [], job.title)
          : job.profession

        // Clean title/company before storing
        const title = cleanJobTitle(job.title)
        const company = cleanJobTitle(job.company)

        // Generate slug
        const slug = generateJobSlug(title, company, job.location || null)
        const existingSlug = await prisma.jobPosting.findUnique({
          where: { slug },
          select: { id: true, externalId: true },
        })
        const finalSlug = existingSlug && existingSlug.externalId !== job.externalId
          ? `${slug}-${job.externalId.slice(-6)}`
          : slug

        await prisma.jobPosting.upsert({
          where: { externalId: job.externalId },
          create: {
            sourceId: jobSource.id,
            externalId: job.externalId,
            slug: finalSlug,
            title,
            company,
            location: job.location || null,
            description: job.description || null,
            salaryMin: job.salaryMin || null,
            salaryMax: job.salaryMax || null,
            currency: job.currency,
            germanLevel: job.germanLevel || null,
            profession,
            jobType: job.jobType || null,
            requirements: job.requirements,
            applyUrl: job.applyUrl || null,
            grade: job.grade || null,
            gradeReason: job.gradeReason || null,
            postedAt: new Date(),
            active: true,
          },
          update: {
            title,
            company,
            location: job.location || null,
            description: job.description || null,
            salaryMin: job.salaryMin || null,
            salaryMax: job.salaryMax || null,
            germanLevel: job.germanLevel || null,
            profession,
            jobType: job.jobType || null,
            requirements: job.requirements,
            applyUrl: job.applyUrl || null,
            grade: job.grade || null,
            gradeReason: job.gradeReason || null,
            active: true,
            updatedAt: new Date(),
          },
        })
        upsertCount++
      } catch (error) {
        console.error(`[Ingest] Failed to upsert job "${job.title}":`, error)
      }
    }

    if (genericUrlCount > 0) {
      console.warn(`[Ingest] ${genericUrlCount}/${jobs.length} jobs from ${sourceName} have generic career page URLs — update Kimi Claw config to extract specific job URLs`)
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
