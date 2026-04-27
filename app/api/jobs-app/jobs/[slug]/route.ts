// app/api/jobs-app/jobs/[slug]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getJobSeeker, isPremiumEffective } from "@/lib/jobs-app-auth"
import { computeHeuristicScore, getMatchLabel } from "@/lib/heuristic-scorer"
import { scoreJobDeep } from "@/lib/jobs-ai"
import { checkRateLimit, RL } from "@/lib/jobs-app-rate-limit"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const job = await prisma.jobPosting.findFirst({
    where: { slug, active: true },
  })

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  // Increment view count
  await prisma.jobPosting.update({
    where: { id: job.id },
    data: { viewCount: { increment: 1 } },
  })

  // Base response (available to all, including Google bots)
  const response: any = {
    job: {
      id: job.id,
      slug: job.slug,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      currency: job.currency,
      germanLevel: job.germanLevel,
      profession: job.profession,
      jobType: job.jobType,
      requirements: job.requirements,
      applyUrl: job.applyUrl,
      postedAt: job.postedAt,
      createdAt: job.createdAt,
      viewCount: job.viewCount + 1,
      // Migrant-aware signals — sent to all callers regardless of premium tier.
      // Premium gating is persuasive UX (LockedBadge "upgrade to view"), not data
      // withholding: signals are LLM-derived from public job text and trivially
      // re-derivable, so server-side omission would add complexity without real
      // protection. Visual gate lives in components/jobs-app/SignalBadges.tsx.
      languageLevel: job.languageLevel,
      englishOk: job.englishOk,
      anerkennungRequired: job.anerkennungRequired,
      visaPathway: job.visaPathway,
      anerkennungSupport: job.anerkennungSupport,
      visaSponsorship: job.visaSponsorship,
      relocationSupport: job.relocationSupport,
    },
    matchScore: null,
    matchLabel: null,
    deepScore: null,
  }

  // If authenticated, add scoring
  const seeker = await getJobSeeker(request)
  if (seeker?.profile) {
    const p = seeker.profile
    const scorerProfile = {
      germanLevel: p.germanLevel ?? null,
      profession: p.profession ?? null,
      targetLocations: (p.targetLocations as string[]) ?? [],
      salaryMin: p.salaryMin ?? null,
      salaryMax: p.salaryMax ?? null,
      visaStatus: p.visaStatus ?? null,
      yearsOfExperience: p.yearsOfExperience ?? null,
    }

    const hScore = computeHeuristicScore(scorerProfile, {
      germanLevel: job.germanLevel,
      profession: job.profession,
      location: job.location,
      jobType: job.jobType,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
    })

    response.matchScore = hScore
    response.matchLabel = getMatchLabel(hScore)

    // AI deep score for premium users only (grandfathered legacy counts)
    if (await isPremiumEffective(seeker)) {
      // Per-seeker rate limit on AI deep scoring — cost damper on
      // Claude Haiku calls. Silently skip (return heuristic only) on
      // limit rather than failing the whole page load.
      const deepLimited = checkRateLimit(
        `deepscore:${seeker.id}`,
        RL.JOB_DEEP_SCORE
      )
      if (deepLimited) {
        return NextResponse.json(response)
      }
      try {
        const deepScore = await scoreJobDeep(
          {
            germanLevel: p.germanLevel,
            profession: p.profession,
            currentJobTitle: p.currentJobTitle,
            yearsOfExperience: p.yearsOfExperience,
            skills: p.skills,
            workExperience: p.workExperience,
            education: p.educationDetails,
            targetLocations: (p.targetLocations as string[]) ?? [],
            salaryMin: p.salaryMin,
            salaryMax: p.salaryMax,
            visaStatus: p.visaStatus,
          },
          {
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description,
            germanLevel: job.germanLevel,
            profession: job.profession,
            jobType: job.jobType,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            requirements: job.requirements,
          }
        )
        response.deepScore = deepScore
      } catch (err) {
        console.error("AI deep scoring failed:", err)
        // Non-fatal — return heuristic score only
      }
    }
  }

  return NextResponse.json(response)
}
