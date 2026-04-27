/**
 * One-time backfill: extract migrant signals for every JobPosting in the DB
 * that hasn't been processed yet (signalsExtractedAt IS NULL) and isn't from
 * a push-source (those arrive pre-signaled).
 *
 * Resumable: failed rows stay signalsExtractedAt:null. Re-running the script
 * resets the cursor and naturally retries them.
 *
 * Concurrency is intentionally low (2) — gemini-client enforces 15 req/min
 * globally, so more workers just sit idle in the rate-limit poll.
 *
 * Usage: npx tsx scripts/backfill-signals.ts
 */

import "dotenv/config"
import { prisma } from "@/lib/prisma"
import { computeSignalsHash, extractSignals } from "@/lib/job-signals"

const BATCH_SIZE = 50
const CONCURRENCY = 2

async function processBatch(jobs: Array<{
  id: string
  title: string
  description: string | null
  requirements: string[]
}>) {
  let succeeded = 0
  let failed = 0
  const queue = [...jobs]
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length > 0) {
        const job = queue.shift()
        if (!job) return
        try {
          const hash = computeSignalsHash(job.title, job.description, job.requirements)
          const result = await extractSignals({
            title: job.title,
            description: job.description,
            requirements: job.requirements,
          })
          if (result.signals) {
            await prisma.jobPosting.update({
              where: { id: job.id },
              data: {
                ...result.signals,
                signalsExtractedAt: new Date(),
                signalsHash: hash,
              },
            })
            succeeded++
          } else {
            console.warn(`[backfill] ${job.id} ${job.title}: ${result.error}`)
            failed++
          }
        } catch (e) {
          console.error(`[backfill] ${job.id} threw:`, (e as Error).message)
          failed++
        }
      }
    })
  )
  return { succeeded, failed }
}

async function main() {
  let totalSucceeded = 0
  let totalFailed = 0
  let cursor: string | undefined
  try {
    while (true) {
      const jobs = await prisma.jobPosting.findMany({
        where: {
          signalsExtractedAt: null,
          source: { isPushSource: false },
        },
        orderBy: { id: "asc" },
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        take: BATCH_SIZE,
        select: { id: true, title: true, description: true, requirements: true },
      })
      if (jobs.length === 0) break
      cursor = jobs[jobs.length - 1].id
      const { succeeded, failed } = await processBatch(jobs)
      totalSucceeded += succeeded
      totalFailed += failed
      console.log(`[backfill] batch done: ${succeeded} ok / ${failed} failed (running total: ${totalSucceeded} / ${totalFailed})`)
    }
    console.log(`[backfill] DONE: ${totalSucceeded} succeeded, ${totalFailed} failed`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
