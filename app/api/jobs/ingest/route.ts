import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { verifyCronSecret } from "@/lib/api-permissions"
import { generateJobSlug, inferProfession, cleanJobTitle } from "@/lib/job-scraper"
import { ingestPerIp, ingestGlobalDaily, extractIp } from "@/lib/rate-limit-upstash"

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

  // Migrant signals (optional — Kimi Claw populates when scraping)
  languageLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2", "NONE"]).nullish(),
  englishOk: z.boolean().nullish(),
  anerkennungRequired: z
    .enum(["REQUIRED", "IN_PROGRESS_OK", "NOT_REQUIRED"])
    .nullish(),
  visaPathway: z
    .enum([
      "BLUE_CARD",
      "CHANCENKARTE",
      "PFLEGE_VISA",
      "AUSBILDUNG",
      "FSJ",
      "EU_ONLY",
      "UNCLEAR",
    ])
    .nullish(),
  anerkennungSupport: z.boolean().nullish(),
  visaSponsorship: z.boolean().nullish(),
  // REJECT (vs. clamp in lib/job-signals.ts) — surfaces upstream scraper config bugs loudly. DB is VarChar(200).
  relocationSupport: z.string().max(200).nullish(),
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

  // Defense-in-depth: even with valid secret, throttle per-IP + global so a
  // leaked secret can't be weaponised for DB-fill / billing attacks.
  const ip = extractIp(request)
  const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 32)
  const ipResult = await ingestPerIp.limit(ipHash).catch(() => ({ success: false, reset: Date.now() + 30_000 }))
  if (!ipResult.success) {
    const retryAfter = Math.max(1, Math.ceil((ipResult.reset - Date.now()) / 1000))
    console.warn(`[Ingest] rate-limit ip-h hit for ${ipHash}`)
    return NextResponse.json(
      { error: "Rate limit exceeded (per-IP)", retryAfterSeconds: retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    )
  }
  const globalResult = await ingestGlobalDaily.limit("global").catch(() => ({ success: false, reset: Date.now() + 30_000 }))
  if (!globalResult.success) {
    const retryAfter = Math.max(1, Math.ceil((globalResult.reset - Date.now()) / 1000))
    console.warn(`[Ingest] rate-limit global-d hit (circuit breaker)`)
    return NextResponse.json(
      { error: "Rate limit exceeded (global)", retryAfterSeconds: retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    )
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
        isPushSource: true,
      },
      update: {
        isPushSource: true,
      },
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

        const hasSignals =
          job.languageLevel != null ||
          job.englishOk != null ||
          job.anerkennungRequired != null ||
          job.visaPathway != null ||
          job.anerkennungSupport != null ||
          job.visaSponsorship != null ||
          job.relocationSupport != null

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
            languageLevel: job.languageLevel ?? null,
            englishOk: job.englishOk ?? null,
            anerkennungRequired: job.anerkennungRequired ?? null,
            visaPathway: job.visaPathway ?? null,
            anerkennungSupport: job.anerkennungSupport ?? null,
            visaSponsorship: job.visaSponsorship ?? null,
            relocationSupport: job.relocationSupport ?? null,
            signalsExtractedAt: hasSignals ? new Date() : null,
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
            ...(hasSignals && {
              languageLevel: job.languageLevel ?? null,
              englishOk: job.englishOk ?? null,
              anerkennungRequired: job.anerkennungRequired ?? null,
              visaPathway: job.visaPathway ?? null,
              anerkennungSupport: job.anerkennungSupport ?? null,
              visaSponsorship: job.visaSponsorship ?? null,
              relocationSupport: job.relocationSupport ?? null,
              signalsExtractedAt: new Date(),
            }),
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
