// app/api/jobs-app/cv/generate/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireJobSeeker, isPremiumEffective } from "@/lib/jobs-app-auth"
import { generateCVContent } from "@/lib/jobs-ai"
import { renderCvHtml } from "@/lib/cv-html-template"
import { renderPdfFromHtml } from "@/lib/pdf-from-html"
import { put } from "@vercel/blob"
import { z } from "zod"
import { checkRateLimit, RL } from "@/lib/jobs-app-rate-limit"

const generateSchema = z.object({
  jobPostingId: z.string().min(1),
  language: z.enum(["en", "de"]).default("en"),
})

export const maxDuration = 60
export const runtime = "nodejs"

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

  // Stage labels so we know exactly where it died in the logs.
  let stage: "ai" | "render" | "upload" | "db" = "ai"
  try {
    // Generate CV content via Claude Sonnet
    stage = "ai"
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
    const fullName =
      [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
      seeker.name ||
      "Candidate"

    stage = "render"
    const html = renderCvHtml({
      content: cvContent,
      name: fullName,
      email: seeker.email,
      phone: profile.phone,
      germanLevel: profile.germanLevel,
      visaStatus: profile.visaStatus,
      language,
      showWatermark: false,
    })
    const pdfBuffer = await renderPdfFromHtml(html, { format: "a4" })

    // Upload to Vercel Blob
    stage = "upload"
    const slug = job.slug || job.id
    const fileName = `cvs/${seeker.id}/${slug}-${Date.now()}.pdf`

    const blob = await put(fileName, pdfBuffer, {
      access: "private",
      contentType: "application/pdf",
    })

    // Save record. Defend against the AI returning a partial response —
    // Prisma rejects `undefined` for the `String[]` column.
    stage = "db"
    const keywordsUsed = Array.isArray(cvContent.keywordsUsed)
      ? cvContent.keywordsUsed.filter((k): k is string => typeof k === "string")
      : []
    const generatedCV = await prisma.generatedCV.create({
      data: {
        seekerId: seeker.id,
        jobPostingId: job.id,
        fileUrl: blob.url,
        fileKey: blob.pathname,
        keywordsUsed,
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
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    const errStack = error instanceof Error ? error.stack : undefined
    console.error(
      `[cv/generate] Failed at stage=${stage}`,
      JSON.stringify({
        seekerId: seeker.id,
        jobPostingId,
        message: errMsg,
        name: error instanceof Error ? error.name : "unknown",
        stack: errStack?.split("\n").slice(0, 5).join(" | "),
      })
    )
    const message =
      stage === "ai"
        ? "AI service temporarily unavailable. Try again in a minute."
        : stage === "render"
        ? "Couldn't render your CV PDF. Try again or contact support."
        : stage === "upload"
        ? "Couldn't save your CV file. Try again."
        : "CV generation failed. Please try again."
    // Include the actual error name + first line of message in the
    // response while we debug the chromium pipeline. Strip stack traces
    // and any text after a colon in the message that might leak file
    // paths. Remove this once CV gen is stable.
    const debugDetail = errMsg.split("\n")[0].slice(0, 200)
    return NextResponse.json(
      { error: message, stage, debugDetail },
      { status: 500 }
    )
  }
}
