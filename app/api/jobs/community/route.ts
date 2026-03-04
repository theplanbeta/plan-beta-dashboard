import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { put } from "@vercel/blob"
import { generateContentWithImage } from "@/lib/gemini-client"
import { reverseGeocode } from "@/lib/geocode"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { checkPermission } from "@/lib/api-permissions"

const uploadLimiter = rateLimit({ windowMs: 86400000, maxRequests: 10 }) // 10/day
const readLimiter = rateLimit(RATE_LIMITS.LENIENT)

const EXTRACTION_PROMPT = `Extract job posting details from this photo of a job advertisement or poster. Return ONLY valid JSON with these fields:
{
  "title": "job title or null",
  "company": "company/employer name or null",
  "location": "city/address or null",
  "description": "brief description of the job or null",
  "contactInfo": "phone/email/website to apply or null",
  "germanLevel": "required German level (A1/A2/B1/B2/C1/C2) or null",
  "jobType": "full-time, part-time, mini-job, werkstudent, internship, or null",
  "salaryInfo": "salary/wage info or null"
}
If the image is not a job posting, return {"error": "not_a_job_posting"}.
If text is in German, translate field values to English where appropriate but keep company names and locations in original language.`

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]

export async function POST(request: NextRequest) {
  const rateLimited = await uploadLimiter(request)
  if (rateLimited) return rateLimited

  try {
    const formData = await request.formData()
    const file = formData.get("photo") as File | null

    if (!file) {
      return NextResponse.json({ error: "No photo provided" }, { status: 400 })
    }

    // Validate file type and size
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Accepted: JPEG, PNG, WebP, HEIC" },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 5MB" },
        { status: 400 }
      )
    }

    // Get optional metadata from form
    const latitude = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null
    const longitude = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null
    const photoTakenAt = formData.get("photoTakenAt") ? new Date(formData.get("photoTakenAt") as string) : null
    const submittedBy = (formData.get("submittedBy") as string) || null

    // Upload to Vercel Blob
    const blob = await put(`community-jobs/${Date.now()}-${file.name}`, file, {
      access: "public",
      contentType: file.type,
    })

    // Convert to base64 for Gemini Vision
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")

    // Extract job details via Gemini Vision
    let extractedData: Record<string, string | null> = {}
    const aiResult = await generateContentWithImage(
      EXTRACTION_PROMPT,
      base64,
      file.type
    )

    if (aiResult.success && aiResult.content) {
      try {
        // Strip markdown code fences if present
        let jsonStr = aiResult.content
        const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (fenceMatch) jsonStr = fenceMatch[1]
        extractedData = JSON.parse(jsonStr.trim())
      } catch {
        console.warn("[CommunityJob] Failed to parse Gemini response:", aiResult.content)
      }
    }

    // Check if Gemini flagged it as not a job posting
    if (extractedData.error === "not_a_job_posting") {
      // Still save it — moderation will handle rejection
      extractedData = {}
    }

    // Reverse geocode if GPS coordinates available
    let cityName: string | null = null
    if (latitude && longitude) {
      cityName = await reverseGeocode(latitude, longitude)
    }

    // Set expiry: 30 days from photo date, or 30 days from now if no date
    const baseDate = photoTakenAt || new Date()
    const expiresAt = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Create CommunityJob record
    const job = await prisma.communityJob.create({
      data: {
        imageUrl: blob.url,
        imageKey: blob.pathname,
        title: extractedData.title || null,
        company: extractedData.company || null,
        location: extractedData.location || null,
        description: extractedData.description || null,
        contactInfo: extractedData.contactInfo || null,
        germanLevel: extractedData.germanLevel || null,
        jobType: extractedData.jobType || null,
        salaryInfo: extractedData.salaryInfo || null,
        latitude,
        longitude,
        photoTakenAt,
        cityName,
        submittedBy,
        submitterType: submittedBy ? "student" : "anonymous",
        expiresAt,
      },
    })

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error("[CommunityJob] Upload failed:", error)
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const rateLimited = await readLimiter(request)
  if (rateLimited) return rateLimited

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "approved"
    const cityName = searchParams.get("city")
    const jobType = searchParams.get("jobType")
    const germanLevel = searchParams.get("germanLevel")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50)

    // Check if authenticated user requesting non-approved statuses
    let allowAllStatuses = false
    if (status !== "approved") {
      const auth = await checkPermission("students", "read")
      if (auth.authorized) {
        allowAllStatuses = true
      }
    }

    const where: Record<string, unknown> = {
      status: allowAllStatuses ? status : "approved",
      expiresAt: { gt: new Date() }, // Only non-expired
    }

    if (cityName) where.cityName = { contains: cityName, mode: "insensitive" }
    if (jobType) where.jobType = jobType
    if (germanLevel) where.germanLevel = germanLevel

    const [jobs, total] = await Promise.all([
      prisma.communityJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          imageUrl: true,
          title: true,
          company: true,
          location: true,
          cityName: true,
          germanLevel: true,
          jobType: true,
          salaryInfo: true,
          viewCount: true,
          createdAt: true,
          status: true,
          ...(allowAllStatuses ? {
            description: true,
            contactInfo: true,
            submittedBy: true,
            submitterType: true,
            latitude: true,
            longitude: true,
            photoTakenAt: true,
            moderatedBy: true,
            moderatedAt: true,
            moderationNote: true,
            reportCount: true,
            expiresAt: true,
          } : {}),
        },
      }),
      prisma.communityJob.count({ where }),
    ])

    return NextResponse.json({
      jobs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("[CommunityJob] List failed:", error)
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 })
  }
}
