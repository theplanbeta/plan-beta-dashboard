import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyCronSecret } from "@/lib/api-permissions"
import { computeSignalsHash, extractSignals } from "@/lib/job-signals"

export const maxDuration = 300

// 50 jobs × 4 runs/hr ≈ 3 Gemini req/min — leaves ~12/min headroom for CV
// parser, blog generator, and other Gemini consumers (15/min global limit).
const BATCH_SIZE = 50
const MAX_ATTEMPTS = 3
const DEADLINE_MS = 270_000

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
        // signalsExtractedAt is set by the ingest route when ANY of the 7
        // signal fields are present in the push payload. Push-sourced jobs
        // that arrive WITHOUT signals (e.g. Kimi Claw can only get
        // listing-page metadata for iframe-based portals like pflegejobs.de)
        // need this worker to backfill from title/description alone.
        signalsExtractedAt: null,
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
      // I3: Deadline-aware early break
      if (Date.now() - startedAt > DEADLINE_MS) {
        console.warn(
          `[Cron:signal-worker] approaching deadline; stopping at ${processed} processed`
        )
        break
      }

      processed++
      const previousAttempts = job.signalAttempt?.attempts ?? 0

      // I1: Per-job try/catch
      try {
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
        // I2: Per-job logging on failure transitions
        if (nextAttempts >= MAX_ATTEMPTS) {
          // Stop retrying — mark extracted-with-no-signals so future runs skip.
          console.warn(
            `[Cron:signal-worker] job ${job.id} exhausted after ${MAX_ATTEMPTS} attempts: ${result.error}`
          )
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
          console.warn(
            `[Cron:signal-worker] job ${job.id} failed (attempt ${nextAttempts}/${MAX_ATTEMPTS}): ${result.error}`
          )
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
      } catch (jobError) {
        // I1: Per-job error handling
        failed++
        const jobErrorMsg =
          jobError instanceof Error ? jobError.message : String(jobError)
        console.error(`[Cron:signal-worker] job ${job.id} threw: ${jobErrorMsg}`)
        // Continue processing remaining jobs instead of crashing
        continue
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
