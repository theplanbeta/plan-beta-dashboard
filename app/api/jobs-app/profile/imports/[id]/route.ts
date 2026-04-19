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

const STUCK_QUEUED_MS = 30_000
const STUCK_PARSING_MS = 90_000

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await loadAndAuthorize(request, id)
  if ("err" in result) return result.err

  let { row } = result

  // Stuck-state detection: if the worker never started or crashed mid-parse,
  // mark as FAILED so the client unblocks and the partial unique index lets
  // the user retry without waiting for the 24h cron sweep.
  const now = Date.now()
  const queuedAgeMs = now - row.createdAt.getTime()
  const parsingAgeMs = row.startedAt ? now - row.startedAt.getTime() : 0

  if (row.status === "QUEUED" && queuedAgeMs > STUCK_QUEUED_MS) {
    console.warn("cv-import stuck in QUEUED, auto-failing", { id: row.id, ageMs: queuedAgeMs })
    row = await prisma.cVImport.update({
      where: { id: row.id },
      data: { status: "FAILED", error: "Worker never started. Please try again." },
    })
  } else if (row.status === "PARSING" && parsingAgeMs > STUCK_PARSING_MS) {
    console.warn("cv-import stuck in PARSING, auto-failing", { id: row.id, ageMs: parsingAgeMs })
    row = await prisma.cVImport.update({
      where: { id: row.id },
      data: { status: "FAILED", error: "Parse took too long. Please try again." },
    })
  }

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
