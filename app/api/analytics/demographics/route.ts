import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"

// GET /api/analytics/demographics - Analyze student demographics
export async function GET(request: NextRequest) {
  const check = await checkPermission("analytics", "read")
  if (!check.authorized) return check.response

  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter") || "active"

    const whereClause = filter === "active" ? { completionStatus: "ACTIVE" as const } : {}

    const students = await prisma.student.findMany({
      where: whereClause,
      select: {
        city: true,
        profession: true,
        age: true,
        dateOfBirth: true,
        relocatingToGermany: true,
        relocationTimeline: true,
        destinationCity: true,
        visaStatus: true,
        referralSource: true,
      },
    })

    const totalStudents = students.length

    // Helper to round percentage to 1 decimal place
    const pct = (count: number) =>
      totalStudents > 0 ? Math.round((count / totalStudents) * 1000) / 10 : 0

    // === CITY DISTRIBUTION (top 10) ===
    const cityMap = new Map<string, number>()
    for (const s of students) {
      const city = s.city || "Unknown"
      cityMap.set(city, (cityMap.get(city) || 0) + 1)
    }
    const cityDistribution = Array.from(cityMap.entries())
      .map(([city, count]) => ({ city, count, percentage: pct(count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // === PROFESSION DISTRIBUTION (top 10) ===
    const professionMap = new Map<string, number>()
    for (const s of students) {
      const profession = s.profession || "Unknown"
      professionMap.set(profession, (professionMap.get(profession) || 0) + 1)
    }
    const professionDistribution = Array.from(professionMap.entries())
      .map(([profession, count]) => ({ profession, count, percentage: pct(count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // === AGE BUCKETS ===
    const now = new Date()
    const ageCounts = { "18-22": 0, "23-27": 0, "28-35": 0, "36+": 0, Unknown: 0 }

    for (const s of students) {
      let age: number | null = null

      if (s.age != null) {
        age = s.age
      } else if (s.dateOfBirth) {
        const dob = new Date(s.dateOfBirth)
        age = now.getFullYear() - dob.getFullYear()
        // Adjust if birthday hasn't occurred yet this year
        const monthDiff = now.getMonth() - dob.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
          age--
        }
      }

      if (age == null) {
        ageCounts["Unknown"]++
      } else if (age >= 18 && age <= 22) {
        ageCounts["18-22"]++
      } else if (age >= 23 && age <= 27) {
        ageCounts["23-27"]++
      } else if (age >= 28 && age <= 35) {
        ageCounts["28-35"]++
      } else {
        ageCounts["36+"]++
      }
    }

    const ageBuckets = (
      ["18-22", "23-27", "28-35", "36+", "Unknown"] as const
    ).map((range) => ({
      range,
      count: ageCounts[range],
      percentage: pct(ageCounts[range]),
    }))

    // === RELOCATION ANALYSIS ===
    const relocatingStudents = students.filter((s) => s.relocatingToGermany)
    const relocatingCount = relocatingStudents.length

    // By timeline
    const timelineMap = new Map<string, number>()
    for (const s of relocatingStudents) {
      const timeline = s.relocationTimeline || "Unknown"
      timelineMap.set(timeline, (timelineMap.get(timeline) || 0) + 1)
    }
    const byTimeline = Array.from(timelineMap.entries())
      .map(([timeline, count]) => ({ timeline, count }))
      .sort((a, b) => b.count - a.count)

    // Top destination cities
    const destMap = new Map<string, number>()
    for (const s of relocatingStudents) {
      const city = s.destinationCity || "Unknown"
      destMap.set(city, (destMap.get(city) || 0) + 1)
    }
    const topDestinations = Array.from(destMap.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // By visa status
    const visaMap = new Map<string, number>()
    for (const s of relocatingStudents) {
      const status = s.visaStatus || "Unknown"
      visaMap.set(status, (visaMap.get(status) || 0) + 1)
    }
    const byVisaStatus = Array.from(visaMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)

    const relocation = {
      relocatingCount,
      percentage: pct(relocatingCount),
      byTimeline,
      topDestinations,
      byVisaStatus,
    }

    // === SOURCE DISTRIBUTION ===
    const sourceMap = new Map<string, number>()
    for (const s of students) {
      const source = s.referralSource || "OTHER"
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1)
    }
    const sourceDistribution = Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count, percentage: pct(count) }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      totalStudents,
      cityDistribution,
      professionDistribution,
      ageBuckets,
      relocation,
      sourceDistribution,
    })
  } catch (error) {
    console.error("Error fetching demographics analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch demographics analytics" },
      { status: 500 }
    )
  }
}
