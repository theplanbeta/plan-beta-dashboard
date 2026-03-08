import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyCronSecret } from "@/lib/api-permissions"

// GET /api/jobs/health — Check for stale job sources (not fetched in 48h)
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)

  const staleSources = await prisma.jobSource.findMany({
    where: {
      active: true,
      OR: [
        { lastFetched: { lt: cutoff } },
        { lastFetched: null },
      ],
    },
    select: {
      id: true,
      name: true,
      url: true,
      lastFetched: true,
      jobCount: true,
    },
  })

  const healthySources = await prisma.jobSource.count({
    where: {
      active: true,
      lastFetched: { gte: cutoff },
    },
  })

  return NextResponse.json({
    healthy: healthySources,
    stale: staleSources.length,
    staleSources,
  })
}
