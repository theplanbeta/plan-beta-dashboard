// app/api/jobs-app/cv/[id]/download/route.ts
//
// Authed proxy route for private Vercel Blob downloads.
// Generated CVs and Anschreibens both live in the GeneratedCV table and
// private Blob storage. Blob URLs are not browsable directly, so this route
// streams the body to the authenticated JobSeeker who owns the document.

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

  // fileKey holds the blob pathname (e.g. "cvs/{seekerId}/{slug}-{ts}.pdf").
  // Older rows may only have fileUrl, so support both shapes.
  const pathname = cv.fileKey || cv.fileUrl
  if (!pathname) {
    return NextResponse.json({ error: "Blob path missing" }, { status: 500 })
  }

  let stream: ReadableStream<Uint8Array>
  let contentType = "application/pdf"
  let contentLength: string | null = null

  if (/^https?:\/\//i.test(pathname)) {
    const blobResponse = await fetch(pathname, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN ?? ""}`,
      },
    })
    if (!blobResponse.ok || !blobResponse.body) {
      return NextResponse.json({ error: "Blob fetch failed" }, { status: 502 })
    }
    stream = blobResponse.body
    contentType = blobResponse.headers.get("content-type") || contentType
    contentLength = blobResponse.headers.get("content-length")
  } else {
    const result = await get(pathname, { access: "private" })
    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ error: "Blob fetch failed" }, { status: 502 })
    }
    stream = result.stream
    contentType = result.blob.contentType || contentType
    contentLength = String(result.blob.size)
  }

  const defaultName = cv.templateUsed === "anschreiben" ? "anschreiben.pdf" : "cv.pdf"
  const filename =
    pathname.split("/").pop()?.replace(/[^a-zA-Z0-9._-]/g, "_") || defaultName

  const headers = new Headers({
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store",
  })
  if (contentLength) headers.set("Content-Length", contentLength)

  return new Response(stream, {
    status: 200,
    headers,
  })
}
