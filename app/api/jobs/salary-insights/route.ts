import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyPortalToken } from "@/lib/jobs-portal-auth"

// GET /api/jobs/salary-insights — Aggregate salary data
// Free: top-level averages. Premium: full breakdown
export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "")
  let isPremium = false
  if (token) {
    const payload = await verifyPortalToken(token)
    if (payload) {
      const sub = await prisma.jobSubscription.findUnique({
        where: { email: payload.email },
        select: { status: true },
      })
      isPremium = sub?.status === "active"
    }
  }

  try {
    const jobsWithSalary = await prisma.jobPosting.findMany({
      where: {
        active: true,
        profession: { in: ["Student Jobs", "Hospitality"] },
        salaryMin: { not: null },
      },
      select: {
        salaryMin: true,
        salaryMax: true,
        location: true,
        germanLevel: true,
        jobType: true,
        currency: true,
      },
    })

    // Top-level stats (free)
    const salaries = jobsWithSalary.map((j) => ({
      min: Number(j.salaryMin) || 0,
      max: Number(j.salaryMax) || Number(j.salaryMin) || 0,
      location: j.location?.split(",")[0].trim() || "Unknown",
      germanLevel: j.germanLevel || "Unknown",
      jobType: j.jobType || "Unknown",
    }))

    const avgMin = salaries.length ? Math.round(salaries.reduce((s, j) => s + j.min, 0) / salaries.length) : 0
    const avgMax = salaries.length ? Math.round(salaries.reduce((s, j) => s + j.max, 0) / salaries.length) : 0
    const medianMin = salaries.length ? salaries.map((s) => s.min).sort((a, b) => a - b)[Math.floor(salaries.length / 2)] : 0

    const summary = {
      totalJobsWithSalary: salaries.length,
      avgSalaryMin: avgMin,
      avgSalaryMax: avgMax,
      medianSalaryMin: medianMin,
    }

    if (!isPremium) {
      // Free users get summary only
      return NextResponse.json({
        summary,
        isPremium: false,
      })
    }

    // Premium: full breakdowns
    const byCity = Object.entries(
      salaries.reduce<Record<string, { total: number; sum: number; max: number }>>((acc, s) => {
        if (!acc[s.location]) acc[s.location] = { total: 0, sum: 0, max: 0 }
        acc[s.location].total++
        acc[s.location].sum += s.min
        acc[s.location].max = Math.max(acc[s.location].max, s.max)
        return acc
      }, {})
    )
      .map(([city, data]) => ({ city, avg: Math.round(data.sum / data.total), max: data.max, count: data.total }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 15)

    const byJobType = Object.entries(
      salaries.reduce<Record<string, { total: number; sum: number }>>((acc, s) => {
        if (!acc[s.jobType]) acc[s.jobType] = { total: 0, sum: 0 }
        acc[s.jobType].total++
        acc[s.jobType].sum += s.min
        return acc
      }, {})
    ).map(([type, data]) => ({ type, avg: Math.round(data.sum / data.total), count: data.total }))

    const byGermanLevel = Object.entries(
      salaries.reduce<Record<string, { total: number; sum: number }>>((acc, s) => {
        if (!acc[s.germanLevel]) acc[s.germanLevel] = { total: 0, sum: 0 }
        acc[s.germanLevel].total++
        acc[s.germanLevel].sum += s.min
        return acc
      }, {})
    ).map(([level, data]) => ({ level, avg: Math.round(data.sum / data.total), count: data.total }))

    return NextResponse.json({
      summary,
      byCity,
      byJobType,
      byGermanLevel,
      isPremium: true,
    })
  } catch (error) {
    console.error("[Salary Insights] Error:", error)
    return NextResponse.json({ error: "Failed to fetch insights" }, { status: 500 })
  }
}
