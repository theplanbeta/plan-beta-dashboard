import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyCronSecret } from "@/lib/api-permissions"
import { computeSignalsHash, extractSignals } from "@/lib/job-signals"

export const maxDuration = 300

const BATCH_SIZE = 100
const MAX_ATTEMPTS = 3

// GET /api/cron/signal-worker — Async signal extraction for unsignaled jobs.
// Skips Kimi-Claw-pushed jobs (their signals arrive in the ingest payload).
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startedAt = Date.now()
  let processed = 0
  let succeeded = 0
  let failed = 0
  let exhausted = 0

  try {
    const jobs = await prisma.jobPosting.findMany({
      where: {
        signalsExtractedAt: null,
        source: { isPushSource: false },
      },
      orderBy: { postedAt: "desc" },
      take: BATCH_SIZE,
      select: {
        id: true,
        title: true,
        description: true,
        requirements: true,
        signalAttempt: { select: { attempts: true } },
      },
    })

    for (const job of jobs) {
      processed++
      const previousAttempts = job.signalAttempt?.attempts ?? 0

      const hash = computeSignalsHash(job.title, job.description, job.requirements)
      const result = await extractSignals({
        title: job.title,
        description: job.description,
        requirements: job.requirements,
      })

      if (result.signals) {
        await prisma.$transaction([
          prisma.jobPosting.update({
            where: { id: job.id },
            data: {
              ...result.signals,
              signalsExtractedAt: new Date(),
              signalsHash: hash,
            },
          }),
          prisma.jobSignalAttempt.deleteMany({ where: { jobId: job.id } }),
        ])
        succeeded++
        continue
      }

      const nextAttempts = previousAttempts + 1
      if (nextAttempts >= MAX_ATTEMPTS) {
        // Stop retrying — mark extracted-with-no-signals so future runs skip.
        await prisma.$transaction([
          prisma.jobPosting.update({
            where: { id: job.id },
            data: {
              signalsExtractedAt: new Date(),
              signalsHash: hash,
            },
          }),
          prisma.jobSignalAttempt.deleteMany({ where: { jobId: job.id } }),
        ])
        exhausted++
      } else {
        await prisma.jobSignalAttempt.upsert({
          where: { jobId: job.id },
          create: {
            jobId: job.id,
            attempts: nextAttempts,
            lastAttemptAt: new Date(),
            lastError: result.error?.slice(0, 500) ?? null,
          },
          update: {
            attempts: nextAttempts,
            lastAttemptAt: new Date(),
            lastError: result.error?.slice(0, 500) ?? null,
          },
        })
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      succeeded,
      failed,
      exhausted,
      durationMs: Date.now() - startedAt,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[Cron:signal-worker] Error:", msg)
    return NextResponse.json({ error: `Signal worker failed: ${msg}` }, { status: 500 })
  }
}
