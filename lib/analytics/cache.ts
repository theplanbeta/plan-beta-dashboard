import { prisma } from "@/lib/prisma"

export async function getCachedOrFetch<T>(
  source: string,
  dateRange: string,
  ttlMinutes: number,
  fetcher: () => Promise<T>
): Promise<T | null> {
  // 1. Check for existing cache entry
  const cached = await prisma.analyticsCache.findUnique({
    where: { source_dateRange: { source, dateRange } },
  })

  // 2. If fresh, return parsed data
  if (cached && cached.expiresAt > new Date()) {
    return cached.data as T
  }

  // 3. Try fetching fresh data
  try {
    const data = await fetcher()

    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)

    await prisma.analyticsCache.upsert({
      where: { source_dateRange: { source, dateRange } },
      update: {
        data: data as any,
        fetchedAt: new Date(),
        expiresAt,
      },
      create: {
        source,
        dateRange,
        data: data as any,
        fetchedAt: new Date(),
        expiresAt,
      },
    })

    return data
  } catch (error) {
    console.error(`[AnalyticsCache] Fetch error for ${source}/${dateRange}:`, error)

    // 4. Stale-while-error: return stale data if available
    if (cached) {
      return cached.data as T
    }

    return null
  }
}

export async function invalidateCache(source?: string): Promise<void> {
  if (source) {
    await prisma.analyticsCache.deleteMany({ where: { source } })
  } else {
    await prisma.analyticsCache.deleteMany()
  }
}
