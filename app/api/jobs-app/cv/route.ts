// app/api/jobs-app/cv/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireJobSeeker } from "@/lib/jobs-app-auth"

export async function GET(request: Request) {
  let seeker
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const cvs = await prisma.generatedCV.findMany({
    where: { seekerId: seeker.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  // Enrich with job titles
  const jobIds = [...new Set(cvs.map((cv) => cv.jobPostingId))]
  const jobs = await prisma.jobPosting.findMany({
    where: { id: { in: jobIds } },
    select: { id: true, title: true, company: true, slug: true },
  })
  const jobMap = new Map(jobs.map((j) => [j.id, j]))

  const enriched = cvs.map((cv) => {
    const job = jobMap.get(cv.jobPostingId)
    return {
      id: cv.id,
      fileUrl: cv.fileUrl,
      language: cv.language,
      keywordsUsed: cv.keywordsUsed,
      templateUsed: cv.templateUsed,
      createdAt: cv.createdAt,
      job: job
        ? { title: job.title, company: job.company, slug: job.slug }
        : { title: "Unknown", company: "Unknown", slug: null },
    }
  })

  return NextResponse.json({ cvs: enriched })
}
