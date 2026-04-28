// app/api/jobs-app/anschreiben/generate/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireJobSeeker, isPremiumEffective } from "@/lib/jobs-app-auth"
import { generateAnschreiben } from "@/lib/jobs-ai"
import { renderAnschreibenHtml } from "@/lib/anschreiben-html-template"
import { renderPdfFromHtml } from "@/lib/pdf-from-html"
import { put } from "@vercel/blob"
import { z } from "zod"
import { checkRateLimit, RL } from "@/lib/jobs-app-rate-limit"

/** Discriminator value stored in GeneratedCV.templateUsed for Anschreiben. */
const ANSCHREIBEN_TEMPLATE = "anschreiben"
const ANSCHREIBEN_MONTHLY_CAP = 5

const generateSchema = z.object({
  jobPostingId: z.string().min(1),
  language: z.enum(["en", "de"]).default("en"),
})

export const maxDuration = 60
export const runtime = "nodejs"

export async function POST(request: Request) {
  // Auth
  let seeker
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  // Premium gating (honours grandfathered legacy subscribers)
  const premium = await isPremiumEffective(seeker)
  if (!premium) {
    return NextResponse.json(
      { error: "Anschreiben generation requires a Premium subscription" },
      { status: 403 }
    )
  }

  // Per-seeker burst rate limit
  const limited = checkRateLimit(`anschreiben:${seeker.id}`, RL.ANSCHREIBEN_GENERATE)
  if (limited) return limited

  // Monthly cap — 5 Anschreibens per seeker per calendar month. We
  // discriminate by templateUsed = "anschreiben" on the shared
  // GeneratedCV table so we don't need a new Prisma model just for
  // counting. See hardening plan § 3.3.
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const anschreibenCount = await prisma.generatedCV.count({
    where: {
      seekerId: seeker.id,
      templateUsed: ANSCHREIBEN_TEMPLATE,
      createdAt: { gte: startOfMonth },
    },
  })

  if (anschreibenCount >= ANSCHREIBEN_MONTHLY_CAP) {
    return NextResponse.json(
      {
        error: `Monthly cover letter limit reached (${ANSCHREIBEN_MONTHLY_CAP}/month)`,
      },
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
      { error: "Complete your profile before generating an Anschreiben" },
      { status: 400 }
    )
  }

  const profile = seeker.profile

  let stage: "ai" | "render" | "upload" | "db" = "ai"
  try {
    // Generate Anschreiben content via Claude Sonnet
    stage = "ai"
    const content = await generateAnschreiben(
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
        location: job.location,
      },
      language
    )

    // Render PDF — defend against partial AI output. Each field gets a
    // safe default so the template never sees undefined/null and
    // renderToBuffer can't crash on .map() of undefined.
    stage = "render"
    const safeContent = {
      senderBlock: content?.senderBlock ?? "",
      date: content?.date ?? new Date().toLocaleDateString(language === "de" ? "de-DE" : "en-GB"),
      recipientBlock: content?.recipientBlock ?? `${job.company}\n${job.location ?? ""}`.trim(),
      subject: content?.subject ?? `Bewerbung als ${job.title}`,
      salutation: content?.salutation ?? (language === "de" ? "Sehr geehrte Damen und Herren," : "Dear Hiring Manager,"),
      paragraphs: Array.isArray(content?.paragraphs) && content.paragraphs.length > 0
        ? content.paragraphs.filter((p): p is string => typeof p === "string")
        : [],
      closing: content?.closing ?? (language === "de" ? "Mit freundlichen Grüßen" : "Sincerely"),
      signature: content?.signature ?? ([profile.firstName, profile.lastName].filter(Boolean).join(" ") || seeker.name),
    }
    if (safeContent.paragraphs.length === 0) {
      throw new Error("AI returned an Anschreiben without body paragraphs")
    }

    const html = renderAnschreibenHtml({
      content: safeContent,
      email: seeker.email,
      phone: profile.phone,
      showWatermark: false,
    })
    const pdfBuffer = await renderPdfFromHtml(html, { format: "a4" })

    // Upload to Vercel Blob
    stage = "upload"
    const slug = job.slug || job.id
    const fileName = `anschreiben/${seeker.id}/${slug}-${Date.now()}.pdf`

    const blob = await put(fileName, pdfBuffer, {
      access: "public",
      contentType: "application/pdf",
    })

    // Record for monthly cap counter
    stage = "db"
    await prisma.generatedCV.create({
      data: {
        seekerId: seeker.id,
        jobPostingId: job.id,
        fileUrl: blob.url,
        fileKey: blob.pathname,
        keywordsUsed: [],
        templateUsed: ANSCHREIBEN_TEMPLATE,
        language,
      },
    })

    return NextResponse.json({
      anschreiben: {
        fileUrl: blob.url,
        language,
        generatedAt: new Date().toISOString(),
      },
      remaining: ANSCHREIBEN_MONTHLY_CAP - anschreibenCount - 1,
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    const errStack = error instanceof Error ? error.stack : undefined
    console.error(
      `[anschreiben/generate] Failed at stage=${stage}`,
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
        ? "Couldn't render your Anschreiben PDF. Try again or contact support."
        : stage === "upload"
        ? "Couldn't save your Anschreiben file. Try again."
        : "Cover letter generation failed. Please try again."
    // Include the actual error name + first line of message in the
    // response while we debug the chromium pipeline. Remove once stable.
    const debugDetail = errMsg.split("\n")[0].slice(0, 200)
    return NextResponse.json(
      { error: message, stage, debugDetail },
      { status: 500 }
    )
  }
}
