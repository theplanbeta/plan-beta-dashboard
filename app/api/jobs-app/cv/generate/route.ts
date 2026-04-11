// app/api/jobs-app/cv/generate/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireJobSeeker, isPremiumEffective } from "@/lib/jobs-app-auth"
import { generateCVContent } from "@/lib/jobs-ai"
import { CVTemplate } from "@/lib/cv-template"
import { renderToBuffer } from "@react-pdf/renderer"
import { put } from "@vercel/blob"
import { z } from "zod"
import React from "react"
import { checkRateLimit, RL } from "@/lib/jobs-app-rate-limit"

const generateSchema = z.object({
  jobPostingId: z.string().min(1),
  language: z.enum(["en", "de"]).default("en"),
})

export const maxDuration = 30

export async function POST(request: Request) {
  let seeker
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const premium = await isPremiumEffective(seeker)

  // Check CV generation limits: free = 0/mo, premium = 5/mo
  if (!premium) {
    return NextResponse.json(
      { error: "CV generation requires a Premium subscription" },
      { status: 403 }
    )
  }

  // Per-seeker burst rate limit (cost damper on top of the monthly cap)
  const limited = checkRateLimit(`cv:${seeker.id}`, RL.CV_GENERATE)
  if (limited) return limited

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  // Exclude Anschreiben rows from the CV cap (they live in the same
  // table with templateUsed = "anschreiben" so the Anschreiben route
  // can count them independently — see anschreiben/generate).
  const cvCount = await prisma.generatedCV.count({
    where: {
      seekerId: seeker.id,
      createdAt: { gte: startOfMonth },
      NOT: { templateUsed: "anschreiben" },
    },
  })

  if (cvCount >= 5) {
    return NextResponse.json(
      { error: "Monthly CV generation limit reached (5/month)" },
      { status: 429 }
    )
  }

  // Validate input
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const parsed = generateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { jobPostingId, language } = parsed.data

  // Fetch job posting
  const job = await prisma.jobPosting.findUnique({
    where: { id: jobPostingId },
  })

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  // Require profile
  if (!seeker.profile) {
    return NextResponse.json(
      { error: "Complete your profile before generating a CV" },
      { status: 400 }
    )
  }

  const profile = seeker.profile

  // Generate CV content via Claude Sonnet
  const cvContent = await generateCVContent(
    {
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: seeker.email,
      phone: profile.phone,
      currentJobTitle: profile.currentJobTitle,
      yearsOfExperience: profile.yearsOfExperience,
      germanLevel: profile.germanLevel,
      englishLevel: profile.englishLevel,
      skills: profile.skills,
      workExperience: profile.workExperience,
      education: profile.educationDetails,
      certifications: profile.certifications,
      visaStatus: profile.visaStatus,
    },
    {
      title: job.title,
      company: job.company,
      description: job.description,
      requirements: job.requirements,
      germanLevel: job.germanLevel,
    },
    language
  )

  // Render PDF
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || seeker.name || "Candidate"

  const pdfBuffer = await renderToBuffer(
    React.createElement(CVTemplate, {
      content: cvContent,
      name: fullName,
      email: seeker.email,
      phone: profile.phone,
      germanLevel: profile.germanLevel,
      visaStatus: profile.visaStatus,
      language,
      showWatermark: false, // premium users get no watermark
    })
  )

  // Upload to Vercel Blob
  const slug = job.slug || job.id
  const fileName = `cvs/${seeker.id}/${slug}-${Date.now()}.pdf`

  const blob = await put(fileName, pdfBuffer, {
    access: "public",
    contentType: "application/pdf",
  })

  // Save record
  const generatedCV = await prisma.generatedCV.create({
    data: {
      seekerId: seeker.id,
      jobPostingId: job.id,
      fileUrl: blob.url,
      fileKey: blob.pathname,
      keywordsUsed: cvContent.keywordsUsed,
      templateUsed: "ats-standard",
      language,
    },
  })

  return NextResponse.json({
    cv: {
      id: generatedCV.id,
      fileUrl: generatedCV.fileUrl,
      language: generatedCV.language,
      keywordsUsed: generatedCV.keywordsUsed,
      createdAt: generatedCV.createdAt,
    },
    remaining: 5 - cvCount - 1,
  })
}
