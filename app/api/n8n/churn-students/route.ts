import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * API endpoint for n8n to fetch students with consecutive absences
 * GET /api/n8n/churn-students?tier=1|2|3
 */
export async function GET(request: NextRequest) {
  try {
    // Security: Verify n8n API key
    const apiKey = request.headers.get("x-n8n-api-key")
    if (apiKey !== process.env.N8N_API_KEY) {
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
          { email: { not: null } },
          { whatsapp: { not: null } },
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
        churnInterventions: {
          where: {
            tier: tier ? parseInt(tier) : undefined,
            createdAt: {
              // Only interventions from last 7 days to avoid duplicates
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        consecutiveAbsences: "desc",
      },
    })

    // Filter out students who already have active interventions
    const studentsNeedingIntervention = students.filter((student) => {
      // If no recent interventions, needs intervention
      if (!student.churnInterventions || student.churnInterventions.length === 0) {
        return true
      }

      // If last intervention is resolved, can create new one
      const lastIntervention = student.churnInterventions[0]
      return lastIntervention.resolved
    })

    // Format response for n8n
    const formattedStudents = studentsNeedingIntervention.map((student) => ({
      // Student info
      id: student.id,
      studentId: student.studentId,
      name: student.name,
      email: student.email,
      whatsapp: student.whatsapp,
      parentName: student.parentName,
      parentWhatsapp: student.parentWhatsapp,

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
