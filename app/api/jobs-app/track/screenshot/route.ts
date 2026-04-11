/**
 * POST /api/jobs-app/track/screenshot
 *
 * Accepts a screenshot of a job application email, classifies it with Claude
 * Vision, and either updates an existing JobApplication (fuzzy company match)
 * or creates a new synthetic one when confidence is high enough.
 */

import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { ApplicationStage } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireJobSeeker, JobSeekerWithProfile } from "@/lib/jobs-app-auth"
import { classifyScreenshot } from "@/lib/application-classifier"
import { checkRateLimit, RL } from "@/lib/jobs-app-rate-limit"

export const maxDuration = 30

// 5 MB upload cap
const MAX_BYTES = 5 * 1024 * 1024

// Confidence threshold for auto-creating a new record
const CREATE_CONFIDENCE = 0.7

export async function POST(request: Request) {
  // --- Auth -----------------------------------------------------------------
  let seeker: JobSeekerWithProfile
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  // --- Rate limit -----------------------------------------------------------
  // Screenshot classification calls Claude Vision — expensive. Cap per seeker.
  const limited = checkRateLimit(
    `screenshot:${seeker.id}`,
    RL.SCREENSHOT_CLASSIFY
  )
  if (limited) return limited

  // --- Parse multipart form -------------------------------------------------
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart/form-data body" },
      { status: 400 }
    )
  }

  const file = formData.get("image") as File | null

  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: "Missing 'image' file field" },
      { status: 400 }
    )
  }

  if (!file.type || !file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "File must be an image" },
      { status: 400 }
    )
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Image must be under ${MAX_BYTES / (1024 * 1024)}MB` },
      { status: 413 }
    )
  }

  // --- Convert to base64 ----------------------------------------------------
  const buffer = await file.arrayBuffer()
  const base64 = Buffer.from(buffer).toString("base64")

  // --- Classify with Claude Vision ------------------------------------------
  let result
  try {
    result = await classifyScreenshot(base64, file.type)
  } catch (err) {
    console.error("[track/screenshot] classification failed:", err)
    return NextResponse.json(
      { error: "Failed to classify screenshot", details: (err as Error).message },
      { status: 500 }
    )
  }

  // --- Fuzzy-match against existing applications ---------------------------
  const applications = await prisma.jobApplication.findMany({
    where: { seekerId: seeker.id },
  })

  const normalizedCompany = result.company.trim().toLowerCase()
  const normalizedRole = result.role.trim().toLowerCase()

  let matched: (typeof applications)[number] | null = null

  if (normalizedCompany) {
    // Prefer exact (case-insensitive) company match, tie-broken by role overlap
    const companyMatches = applications.filter((a) => {
      const c = a.jobCompany.trim().toLowerCase()
      return c === normalizedCompany || c.includes(normalizedCompany) || normalizedCompany.includes(c)
    })

    if (companyMatches.length === 1) {
      matched = companyMatches[0]
    } else if (companyMatches.length > 1) {
      // Disambiguate by role overlap
      const roleMatch = companyMatches.find((a) => {
        const t = a.jobTitle.trim().toLowerCase()
        return (
          normalizedRole &&
          (t === normalizedRole || t.includes(normalizedRole) || normalizedRole.includes(t))
        )
      })
      matched = roleMatch ?? companyMatches[0]
    }
  }

  // --- Map status string to enum -------------------------------------------
  const stage = result.status as ApplicationStage

  // --- Update existing application ------------------------------------------
  if (matched) {
    const updateData: {
      stage: ApplicationStage
      interviewDate?: Date
    } = {
      stage,
    }

    if (result.interviewDate && stage === ApplicationStage.INTERVIEW) {
      const d = new Date(result.interviewDate)
      if (!Number.isNaN(d.getTime())) {
        updateData.interviewDate = d
      }
    }

    const application = await prisma.jobApplication.update({
      where: { id: matched.id },
      data: updateData,
    })

    return NextResponse.json({
      matched: true,
      application,
      parsed: result,
    })
  }

  // --- No match: gate by confidence ----------------------------------------
  if (result.confidence < CREATE_CONFIDENCE) {
    return NextResponse.json({
      matched: false,
      parsed: result,
      error: "Low confidence, please update manually",
    })
  }

  // --- Create a new synthetic JobApplication --------------------------------
  if (!result.company || !result.role) {
    return NextResponse.json({
      matched: false,
      parsed: result,
      error: "Could not extract company or role from screenshot",
    })
  }

  const createData: {
    seekerId: string
    jobPostingId: string
    jobTitle: string
    jobCompany: string
    jobLocation: string | null
    stage: ApplicationStage
    notes: string
    interviewDate?: Date
  } = {
    seekerId: seeker.id,
    jobPostingId: "screenshot-" + crypto.randomUUID(),
    jobTitle: result.role,
    jobCompany: result.company,
    jobLocation: null,
    stage,
    notes: "Created from screenshot: " + (result.details || ""),
  }

  if (result.interviewDate && stage === ApplicationStage.INTERVIEW) {
    const d = new Date(result.interviewDate)
    if (!Number.isNaN(d.getTime())) {
      createData.interviewDate = d
    }
  }

  const createdApp = await prisma.jobApplication.create({
    data: createData,
  })

  return NextResponse.json({
    matched: false,
    application: createdApp,
    parsed: result,
    created: true,
  })
}
