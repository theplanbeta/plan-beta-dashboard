// app/api/cron/purge-cv-imports/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { del } from "@vercel/blob"
import { verifyCronSecret } from "@/lib/api-permissions"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const expired = await prisma.cVImport.findMany({
    where: { expiresAt: { lt: now }, consumedAt: null },
    select: { id: true, blobKey: true },
  })

  let blobDeletes = 0
  for (const row of expired) {
    if (row.blobKey) {
      try { await del(row.blobKey); blobDeletes++ } catch {}
    }
  }

  const { count } = await prisma.cVImport.deleteMany({
    where: { expiresAt: { lt: now }, consumedAt: null },
  })

  return NextResponse.json({ rowsDeleted: count, blobsDeleted: blobDeletes })
}
