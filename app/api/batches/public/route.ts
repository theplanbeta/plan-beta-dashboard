import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { COURSE_PRICING, COURSE_INFO } from "@/lib/pricing"

const limiter = rateLimit(RATE_LIMITS.LENIENT)

// GET /api/batches/public — Public endpoint for website to show live batch data
export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const rateLimitResponse = await limiter(request)
    if (rateLimitResponse) return rateLimitResponse

    const batches = await prisma.batch.findMany({
      where: {
        status: { in: ["FILLING", "RUNNING"] },
      },
      select: {
        id: true,
        batchCode: true,
        level: true,
        status: true,
        totalSeats: true,
        startDate: true,
        endDate: true,
        schedule: true,
        timing: true,
        _count: {
          select: {
            students: {
              where: {
                completionStatus: { in: ["ACTIVE", "COMPLETED"] },
              },
            },
          },
        },
      },
      orderBy: [
        { status: "asc" }, // FILLING first
        { startDate: "asc" },
      ],
    })

    const publicBatches = batches.map((batch) => {
      const enrolledCount = batch._count.students
      const availableSeats = Math.max(0, batch.totalSeats - enrolledCount)
      const levelKey = batch.level as keyof typeof COURSE_PRICING
      const pricing = COURSE_PRICING[levelKey] || { EUR: 0, INR: 0 }
      const info = COURSE_INFO[levelKey]

      return {
        id: batch.id,
        batchCode: batch.batchCode,
        level: batch.level,
        levelLabel: info?.label || batch.level,
        levelDescription: info?.description || "",
        levelColor: info?.color || "#6b7280",
        status: batch.status,
        totalSeats: batch.totalSeats,
        enrolledCount,
        availableSeats,
        startDate: batch.startDate,
        endDate: batch.endDate,
        schedule: batch.schedule,
        timing: batch.timing,
        pricing,
      }
    })

    return NextResponse.json(
      { batches: publicBatches },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    )
  } catch (error) {
    console.error("Error fetching public batches:", error)
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    )
  }
}
