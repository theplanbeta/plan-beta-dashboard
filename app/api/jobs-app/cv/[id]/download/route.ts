// app/api/jobs-app/cv/[id]/download/route.ts
//
// Authed proxy route for private Vercel Blob downloads.
// Generated CVs and Anschreibens both live in the GeneratedCV table and
// private Blob storage. Blob URLs are not browsable directly, so this route
// streams the body to the authenticated JobSeeker who owns the document.

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireJobSeeker } from "@/lib/jobs-app-auth"
import { loadGeneratedDocument } from "@/lib/jobs-generated-document-storage"

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

  const loaded = await loadGeneratedDocument(pathname)
  if (!loaded) {
    return NextResponse.json({ error: "Document fetch failed" }, { status: 502 })
  }

  const defaultName = cv.templateUsed === "anschreiben" ? "anschreiben.pdf" : "cv.pdf"
  const filename =
    pathname.split("/").pop()?.replace(/[^a-zA-Z0-9._-]/g, "_") || defaultName

  const headers = new Headers({
    "Content-Type": loaded.contentType,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store",
  })
  if (loaded.contentLength) headers.set("Content-Length", loaded.contentLength)

  return new Response(loaded.body, {
    status: 200,
    headers,
  })
}
