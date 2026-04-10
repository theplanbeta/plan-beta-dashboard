import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getJobSeeker, requireJobSeeker } from "@/lib/jobs-app-auth"

// ---------------------------------------------------------------------------
// Zod schema for PUT body
// ---------------------------------------------------------------------------

const updateProfileSchema = z.object({
  name: z.string().optional(),
  germanLevel: z.string().optional(),
  profession: z.string().optional(),
  currentLocation: z.string().optional(),
  targetLocations: z.array(z.string()).optional(),
  visaStatus: z.string().optional(),
  currentJobTitle: z.string().optional(),
  yearsOfExperience: z.number().int().min(0).optional(),
  targetRoles: z.array(z.string()).optional(),
  skills: z.any().optional(),
  salaryMin: z.number().int().optional(),
  salaryMax: z.number().int().optional(),
  salaryCurrency: z.string().optional(),
  education: z.any().optional(),
  germanCertificate: z.string().optional(),
  englishLevel: z.string().optional(),
  certifications: z.any().optional(),
  workExperience: z.any().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Completeness calculator (0-100)
// ---------------------------------------------------------------------------

function calcProfileCompleteness(
  existing: Record<string, unknown>,
  updates: z.infer<typeof updateProfileSchema>
): number {
  // Merge existing profile fields with incoming updates for scoring
  const merged = { ...existing, ...updates }

  const checks = [
    Boolean(merged.germanLevel),
    Boolean(merged.profession),
    Boolean(merged.currentJobTitle),
    merged.yearsOfExperience !== undefined && merged.yearsOfExperience !== null,
    Boolean(merged.workExperience),
    Boolean(merged.education),
    Boolean(merged.skills),
    Array.isArray(merged.targetLocations) && (merged.targetLocations as string[]).length > 0,
    Boolean(merged.salaryMin),
    Boolean(merged.visaStatus),
  ]

  const filled = checks.filter(Boolean).length
  return Math.round((filled / 10) * 100)
}

// ---------------------------------------------------------------------------
// GET /api/jobs-app/profile
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const seeker = await getJobSeeker(request)
  if (!seeker) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({
    seeker: {
      id: seeker.id,
      email: seeker.email,
      name: seeker.name,
      tier: seeker.tier,
      subscriptionStatus: seeker.subscriptionStatus,
      onboardingComplete: seeker.onboardingComplete,
      profile: seeker.profile,
    },
  })
}

// ---------------------------------------------------------------------------
// PUT /api/jobs-app/profile
// ---------------------------------------------------------------------------

export async function PUT(request: Request) {
  let seeker: Awaited<ReturnType<typeof requireJobSeeker>>
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const data = parsed.data

  // Build existing profile data for completeness scoring
  const existingProfile = seeker.profile ?? {}

  const profileCompleteness = calcProfileCompleteness(
    existingProfile as Record<string, unknown>,
    data
  )

  // Upsert the profile
  const profile = await prisma.jobSeekerProfile.upsert({
    where: { seekerId: seeker.id },
    create: {
      seekerId: seeker.id,
      firstName: data.firstName,
      lastName: data.lastName,
      germanLevel: data.germanLevel,
      profession: data.profession,
      currentLocation: data.currentLocation,
      targetLocations: data.targetLocations ?? [],
      visaStatus: data.visaStatus,
      currentJobTitle: data.currentJobTitle,
      yearsOfExperience: data.yearsOfExperience,
      targetRoles: data.targetRoles ?? [],
      skills: data.skills,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      salaryCurrency: data.salaryCurrency,
      educationDetails: data.education,
      germanCertificate: data.germanCertificate,
      englishLevel: data.englishLevel,
      certifications: data.certifications,
      workExperience: data.workExperience,
      profileCompleteness,
    },
    update: {
      ...(data.firstName !== undefined && { firstName: data.firstName }),
      ...(data.lastName !== undefined && { lastName: data.lastName }),
      ...(data.germanLevel !== undefined && { germanLevel: data.germanLevel }),
      ...(data.profession !== undefined && { profession: data.profession }),
      ...(data.currentLocation !== undefined && { currentLocation: data.currentLocation }),
      ...(data.targetLocations !== undefined && { targetLocations: data.targetLocations }),
      ...(data.visaStatus !== undefined && { visaStatus: data.visaStatus }),
      ...(data.currentJobTitle !== undefined && { currentJobTitle: data.currentJobTitle }),
      ...(data.yearsOfExperience !== undefined && { yearsOfExperience: data.yearsOfExperience }),
      ...(data.targetRoles !== undefined && { targetRoles: data.targetRoles }),
      ...(data.skills !== undefined && { skills: data.skills }),
      ...(data.salaryMin !== undefined && { salaryMin: data.salaryMin }),
      ...(data.salaryMax !== undefined && { salaryMax: data.salaryMax }),
      ...(data.salaryCurrency !== undefined && { salaryCurrency: data.salaryCurrency }),
      ...(data.education !== undefined && { educationDetails: data.education }),
      ...(data.germanCertificate !== undefined && { germanCertificate: data.germanCertificate }),
      ...(data.englishLevel !== undefined && { englishLevel: data.englishLevel }),
      ...(data.certifications !== undefined && { certifications: data.certifications }),
      ...(data.workExperience !== undefined && { workExperience: data.workExperience }),
      profileCompleteness,
    },
  })

  // Update JobSeeker.name if provided
  // Update onboardingComplete if germanLevel + profession are both set after this update
  const finalGermanLevel = data.germanLevel ?? seeker.profile?.germanLevel
  const finalProfession = data.profession ?? seeker.profile?.profession
  const shouldCompleteOnboarding = Boolean(finalGermanLevel && finalProfession)

  const seekerUpdates: Record<string, unknown> = {}
  if (data.name !== undefined) seekerUpdates.name = data.name
  if (shouldCompleteOnboarding && !seeker.onboardingComplete) {
    seekerUpdates.onboardingComplete = true
  }

  if (Object.keys(seekerUpdates).length > 0) {
    await prisma.jobSeeker.update({
      where: { id: seeker.id },
      data: seekerUpdates,
    })
  }

  return NextResponse.json({ profile })
}
