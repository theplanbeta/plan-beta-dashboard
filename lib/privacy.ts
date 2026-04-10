import { prisma } from "@/lib/prisma"

interface EraseResult {
  pageViewsDeleted: number
  leadsUpdated: number
}

/**
 * Soft-delete all PageView records and clear visitorId on Lead records
 * for a given visitor. Used for GDPR Article 17 erasure requests.
 */
export async function eraseVisitorData(visitorId: string): Promise<EraseResult> {
  if (!visitorId) {
    return { pageViewsDeleted: 0, leadsUpdated: 0 }
  }

  const now = new Date()

  const [pageViewResult, leadResult] = await Promise.all([
    prisma.pageView.updateMany({
      where: { visitorId, deletedAt: null },
      data: { deletedAt: now },
    }),
    prisma.lead.updateMany({
      where: { visitorId },
      data: { visitorId: null },
    }),
  ])

  console.log(
    `🔒 GDPR erasure: visitorId=${visitorId} — ${pageViewResult.count} pageviews soft-deleted, ${leadResult.count} leads cleared`
  )

  return {
    pageViewsDeleted: pageViewResult.count,
    leadsUpdated: leadResult.count,
  }
}

/**
 * Hard-delete PageView records that were soft-deleted more than `days` ago.
 * Intended to be called from a monthly cleanup cron.
 */
export async function purgeDeletedPageViews(days: number = 30): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const result = await prisma.pageView.deleteMany({
    where: {
      deletedAt: { not: null, lt: cutoff },
    },
  })

  console.log(`🗑️ Purged ${result.count} soft-deleted PageViews older than ${days} days`)
  return result.count
}
