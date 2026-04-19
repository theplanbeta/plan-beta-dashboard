// app/api/jobs-app/cv/[id]/download/route.ts
//
// Authed proxy route for private Vercel Blob downloads.
// The `cvs` folder lives in the private `plan-beta-cvs` store (fra1), so
// blob URLs are not browsable directly — this route fetches via the SDK's
// get() helper (which authenticates with BLOB_READ_WRITE_TOKEN) and streams
// the body to the authenticated JobSeeker who owns the GeneratedCV.

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireJobSeeker } from "@/lib/jobs-app-auth"
import { get } from "@vercel/blob"

export const runtime = "nodejs"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let seeker
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const { id } = await params
  const cv = await prisma.generatedCV.findUnique({ where: { id } })

  if (!cv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (cv.seekerId !== seeker.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // fileKey holds the blob pathname (e.g. "cvs/{seekerId}/{slug}-{ts}.pdf")
  // fall back to fileUrl when fileKey is not populated on older rows.
  const pathname = cv.fileKey || cv.fileUrl
  if (!pathname) {
    return NextResponse.json({ error: "Blob path missing" }, { status: 500 })
  }

  const result = await get(pathname, { access: "private" })
  if (!result || result.statusCode !== 200 || !result.stream) {
    return NextResponse.json({ error: "Blob fetch failed" }, { status: 502 })
  }

  const filename =
    pathname.split("/").pop()?.replace(/[^a-zA-Z0-9._-]/g, "_") || "cv.pdf"

  return new Response(result.stream, {
    status: 200,
    headers: {
      "Content-Type": result.blob.contentType || "application/pdf",
      "Content-Length": String(result.blob.size),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
