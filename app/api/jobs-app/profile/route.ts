import { NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  getJobSeeker,
  isPremiumEffective,
  requireJobSeeker,
} from "@/lib/jobs-app-auth"
import { PARSED_CV_SCALAR_KEYS } from "@/lib/profile-merge"

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

  // Single canonical source of truth for premium. Matches the server-side
  // gate used by CV, Anschreiben and AI scoring routes.
  const isPremium = await isPremiumEffective(seeker)

  return NextResponse.json({
    seeker: {
      id: seeker.id,
      email: seeker.email,
      name: seeker.name,
      tier: seeker.tier,
      subscriptionStatus: seeker.subscriptionStatus,
      currentPeriodEnd: seeker.currentPeriodEnd,
      billingProvider: seeker.billingProvider,
      stripeCustomerId: seeker.stripeCustomerId,
      planBetaStudentId: seeker.planBetaStudentId,
      onboardingComplete: seeker.onboardingComplete,
      isPremium,
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

// ---------------------------------------------------------------------------
// PATCH /api/jobs-app/profile
// Used by the CV upload review/merge flow. Computes manuallyEditedFields
// server-side by diffing incoming payload vs existing profile. Consumes a
// CVImport row if importId query param is provided.
// ---------------------------------------------------------------------------

export async function PATCH(request: Request) {
  let seeker
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const url = new URL(request.url)
  const importId = url.searchParams.get("importId")

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 422 }
    )
  }
  const updates = parsed.data

  const existing = await prisma.jobSeekerProfile.findUnique({
    where: { seekerId: seeker.id },
  })

  // Compute diff → paths that changed become manuallyEditedFields
  const prevEdited =
    (existing?.manuallyEditedFields as Record<string, true> | null) ?? {}
  const nextEdited: Record<string, true> = { ...prevEdited }

  // CV-parsed scalars come from the shared constant (drift-tested).
  // Onboarding-only scalars (germanLevel, profession) are appended here.
  const scalarKeys = [...PARSED_CV_SCALAR_KEYS, "germanLevel", "profession"] as const

  for (const key of scalarKeys) {
    if (!(key in updates)) continue
    const before = existing ? (existing as Record<string, unknown>)[key] : null
    const after = (updates as Record<string, unknown>)[key]
    if (after !== undefined && after !== before) {
      nextEdited[`profile.${key}`] = true
    }
  }

  if (
    "skills" in updates &&
    JSON.stringify(updates.skills) !== JSON.stringify(existing?.skills)
  ) {
    nextEdited["profile.skills"] = true
  }
  // Array-level flags — user-initiated PATCH of these fields is intentional.
  // Note: Zod schema uses `education` (not `educationDetails`) as the input key,
  // but we persist it as the Prisma column `educationDetails`, so the edit flag
  // uses the Prisma-column path to stay consistent with profile-merge.ts reads.
  if ("workExperience" in updates) nextEdited["profile.workExperience"] = true
  if ("education" in updates) nextEdited["profile.educationDetails"] = true
  if ("certifications" in updates) nextEdited["profile.certifications"] = true

  await prisma.jobSeekerProfile.upsert({
    where: { seekerId: seeker.id },
    create: {
      seekerId: seeker.id,
      firstName: updates.firstName,
      lastName: updates.lastName,
      germanLevel: updates.germanLevel,
      profession: updates.profession,
      currentLocation: updates.currentLocation,
      targetLocations: updates.targetLocations ?? [],
      visaStatus: updates.visaStatus,
      currentJobTitle: updates.currentJobTitle,
      yearsOfExperience: updates.yearsOfExperience,
      targetRoles: updates.targetRoles ?? [],
      skills: updates.skills,
      salaryMin: updates.salaryMin,
      salaryMax: updates.salaryMax,
      salaryCurrency: updates.salaryCurrency,
      educationDetails: updates.education,
      germanCertificate: updates.germanCertificate,
      englishLevel: updates.englishLevel,
      certifications: updates.certifications,
      workExperience: updates.workExperience,
      manuallyEditedFields: nextEdited as Prisma.InputJsonValue,
    },
    update: {
      ...(updates.firstName !== undefined && { firstName: updates.firstName }),
      ...(updates.lastName !== undefined && { lastName: updates.lastName }),
      ...(updates.germanLevel !== undefined && { germanLevel: updates.germanLevel }),
      ...(updates.profession !== undefined && { profession: updates.profession }),
      ...(updates.currentLocation !== undefined && { currentLocation: updates.currentLocation }),
      ...(updates.targetLocations !== undefined && { targetLocations: updates.targetLocations }),
      ...(updates.visaStatus !== undefined && { visaStatus: updates.visaStatus }),
      ...(updates.currentJobTitle !== undefined && { currentJobTitle: updates.currentJobTitle }),
      ...(updates.yearsOfExperience !== undefined && { yearsOfExperience: updates.yearsOfExperience }),
      ...(updates.targetRoles !== undefined && { targetRoles: updates.targetRoles }),
      ...(updates.skills !== undefined && { skills: updates.skills }),
      ...(updates.salaryMin !== undefined && { salaryMin: updates.salaryMin }),
      ...(updates.salaryMax !== undefined && { salaryMax: updates.salaryMax }),
      ...(updates.salaryCurrency !== undefined && { salaryCurrency: updates.salaryCurrency }),
      ...(updates.education !== undefined && { educationDetails: updates.education }),
      ...(updates.germanCertificate !== undefined && { germanCertificate: updates.germanCertificate }),
      ...(updates.englishLevel !== undefined && { englishLevel: updates.englishLevel }),
      ...(updates.certifications !== undefined && { certifications: updates.certifications }),
      ...(updates.workExperience !== undefined && { workExperience: updates.workExperience }),
      manuallyEditedFields: nextEdited as Prisma.InputJsonValue,
    },
  })

  // Consume the import if one was referenced
  if (importId) {
    const imp = await prisma.cVImport.findUnique({ where: { id: importId } })
    if (
      imp &&
      imp.seekerId === seeker.id &&
      imp.status === "READY" &&
      !imp.consumedAt
    ) {
      await prisma.cVImport.update({
        where: { id: importId },
        data: { consumedAt: new Date() },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
