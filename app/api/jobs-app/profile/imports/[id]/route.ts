// app/api/jobs-app/profile/imports/[id]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireJobSeeker } from "@/lib/jobs-app-auth"
import { del } from "@vercel/blob"

export const runtime = "nodejs"

async function loadAndAuthorize(request: Request, id: string) {
  let seeker
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return { err: e } as const
    throw e
  }
  const row = await prisma.cVImport.findUnique({ where: { id } })
  if (!row) return { err: NextResponse.json({ error: "Not found" }, { status: 404 }) }
  if (row.seekerId !== seeker.id)
    return { err: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  return { row, seeker } as const
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await loadAndAuthorize(request, id)
  if ("err" in result) return result.err

  const { row } = result
  return NextResponse.json({
    id: row.id,
    status: row.status,
    mode: row.mode,
    progress: row.progress,
    parsedData: row.status === "READY" ? row.parsedData : null,
    mergeDiff: row.status === "READY" ? row.mergeDiff : null,
    error: row.error,
    createdAt: row.createdAt,
    consumedAt: row.consumedAt,
    expiresAt: row.expiresAt,
  })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await loadAndAuthorize(request, id)
  if ("err" in result) return result.err
  const { row } = result

  if (row.blobKey) {
    try { await del(row.blobKey) } catch {}
  }
  await prisma.cVImport.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
