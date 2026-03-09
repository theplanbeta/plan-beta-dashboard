import { NextRequest, NextResponse } from "next/server"
import { verifyCronSecret } from "@/lib/api-permissions"
import { getCachedOrFetch, invalidateCache } from "@/lib/analytics/cache"
import { fetchAllGA4Data } from "@/lib/analytics/ga4"
import { fetchAllGSCData } from "@/lib/analytics/gsc"
import { fetchAllVercelData } from "@/lib/analytics/vercel-analytics"

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Invalidate all caches first
  await invalidateCache()

  // Pre-warm caches for common date ranges
  const results = await Promise.allSettled([
    getCachedOrFetch("ga4", "7d", 240, () => fetchAllGA4Data(7)),
    getCachedOrFetch("ga4", "30d", 240, () => fetchAllGA4Data(30)),
    getCachedOrFetch("gsc", "7d", 240, () => fetchAllGSCData(7)),
    getCachedOrFetch("gsc", "30d", 240, () => fetchAllGSCData(30)),
    getCachedOrFetch("vercel_web", "7d", 60, () => fetchAllVercelData(7)),
    getCachedOrFetch("vercel_web", "30d", 60, () => fetchAllVercelData(30)),
  ])

  const succeeded = results.filter(r => r.status === "fulfilled").length
  const failed = results.filter(r => r.status === "rejected").length

  return NextResponse.json({
    success: true,
    message: `Analytics cache warmed: ${succeeded} succeeded, ${failed} failed`,
    timestamp: new Date().toISOString(),
  })
}
