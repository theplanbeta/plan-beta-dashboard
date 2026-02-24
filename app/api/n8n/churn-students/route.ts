import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { timingSafeEqual } from "crypto"

function verifyN8nAuth(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-n8n-api-key") || ""
  const expected = process.env.N8N_API_KEY || ""
  if (!expected || apiKey.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(apiKey), Buffer.from(expected))
  } catch {
    return false
  }
}

/**
 * API endpoint for n8n to fetch students with consecutive absences
 * GET /api/n8n/churn-students?tier=1|2|3
 */
export async function GET(request: NextRequest) {
  try {
    // Security: Verify n8n API key (timing-safe)
    if (!verifyN8nAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get tier from query params
    const searchParams = request.nextUrl.searchParams
    const tier = searchParams.get("tier")

    // Determine absence threshold based on tier
    let minAbsences = 2
    if (tier === "2") minAbsences = 3
    if (tier === "3") minAbsences = 5

    // Fetch students with consecutive absences
    const students = await prisma.student.findMany({
      where: {
        completionStatus: "ACTIVE",
        consecutiveAbsences: {
          gte: minAbsences,
        },
        // Only students with email/whatsapp
        OR: [
          { email: { not: "" } },
          { whatsapp: { not: "" } },
        ],
      },
      include: {
        batch: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
                whatsapp: true,
              },
            },
          },
        },
      },
      orderBy: {
        consecutiveAbsences: "desc",
      },
    })

    // TODO: Filter logic removed - churnInterventions model not yet implemented
    // For now, return all students matching the criteria
    const studentsNeedingIntervention = students

    // Format response for n8n
    const formattedStudents = studentsNeedingIntervention.map((student) => ({
      // Student info
      id: student.id,
      studentId: student.studentId,
      name: student.name,
      email: student.email,
      whatsapp: student.whatsapp,

      // Absence info
      consecutiveAbsences: student.consecutiveAbsences,
      lastAbsenceDate: student.lastAbsenceDate,
      attendanceRate: student.attendanceRate,
      classesAttended: student.classesAttended,
      totalClasses: student.totalClasses,
      churnRisk: student.churnRisk,

      // Batch info
      batchCode: student.batch?.batchCode,
      batchLevel: student.batch?.level,
      teacherName: student.batch?.teacher?.name,
      teacherEmail: student.batch?.teacher?.email,
      teacherWhatsapp: student.batch?.teacher?.whatsapp,

      // Payment info (for retention offers)
      currentLevel: student.currentLevel,
      paymentStatus: student.paymentStatus,
      balance: student.balance,
      currency: student.currency,

      // Suggested tier
      suggestedTier:
        student.consecutiveAbsences >= 5 ? 3 : student.consecutiveAbsences >= 3 ? 2 : 1,

      // Timestamp
      fetchedAt: new Date().toISOString(),
    }))

    return NextResponse.json({
      success: true,
      count: formattedStudents.length,
      tier: tier ? parseInt(tier) : "all",
      students: formattedStudents,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching churn students:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch students",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
