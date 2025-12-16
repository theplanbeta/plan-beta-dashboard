import { NextRequest, NextResponse } from 'next/server'
import { checkPermission } from '@/lib/api-permissions'
import { prisma } from '@/lib/prisma'
import { suggestConnectionsQuerySchema } from '@/lib/outreach-validation'
import { z } from 'zod'
import { Level } from '@prisma/client'

// GET /api/outreach/connections/suggest - Get suggested connections for a student
export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission('outreach', 'read')
    if (!check.authorized) return check.response

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const limitParam = searchParams.get('limit')

    // Validate query params
    let validatedParams: z.infer<typeof suggestConnectionsQuerySchema>
    try {
      validatedParams = suggestConnectionsQuerySchema.parse({
        studentId: studentId || undefined,
        limit: limitParam ? parseInt(limitParam) : 5,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid query parameters', details: error.issues },
          { status: 400 }
        )
      }
      throw error
    }

    // Get the target student
    const student = await prisma.student.findUnique({
      where: { id: validatedParams.studentId },
      include: {
        batch: true,
        communityConnections: {
          select: {
            connectedStudentId: true,
          },
        },
      },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Get list of already connected student IDs
    const connectedStudentIds = student.communityConnections.map(
      (c) => c.connectedStudentId
    )

    // Find potential matches
    // Criteria:
    // 1. Same level or adjacent levels
    // 2. Not already connected
    // 3. Active students
    // 4. Different batches (for cross-batch connections)
    const adjacentLevels = getAdjacentLevels(student.currentLevel)

    const potentialMatches = await prisma.student.findMany({
      where: {
        id: {
          not: student.id,
          notIn: connectedStudentIds,
        },
        completionStatus: 'ACTIVE',
        currentLevel: {
          in: adjacentLevels,
        },
        batchId: {
          not: student.batchId,
        },
      },
      include: {
        batch: {
          select: {
            batchCode: true,
            level: true,
            timing: true,
          },
        },
      },
      take: validatedParams.limit * 2, // Get more to filter
    })

    // Score and rank matches
    const scoredMatches = potentialMatches
      .map((match) => {
        let score = 0
        let reasons: string[] = []

        // Same level = higher score
        if (match.currentLevel === student.currentLevel) {
          score += 10
          reasons.push(`Both studying ${match.currentLevel}`)
        } else {
          score += 5
          reasons.push(
            `${student.name} is at ${student.currentLevel}, ${match.name} is at ${match.currentLevel}`
          )
        }

        // Similar attendance rate
        const attendanceDiff = Math.abs(
          match.attendanceRate.toNumber() - student.attendanceRate.toNumber()
        )
        if (attendanceDiff < 10) {
          score += 5
          reasons.push('Similar attendance patterns')
        }

        // Similar enrollment date (cohort effect)
        const enrollmentDiff = Math.abs(
          match.enrollmentDate.getTime() - student.enrollmentDate.getTime()
        )
        const daysDiff = enrollmentDiff / (1000 * 60 * 60 * 24)
        if (daysDiff < 30) {
          score += 8
          reasons.push('Started learning around the same time')
        }

        // Same referral source (common background)
        if (match.referralSource === student.referralSource) {
          score += 3
          reasons.push(`Both discovered us through ${match.referralSource}`)
        }

        // Different timing (morning vs evening) - can share experiences
        if (
          match.batch?.timing &&
          student.batch?.timing &&
          match.batch.timing !== student.batch.timing
        ) {
          score += 4
          reasons.push(
            'Can share experiences from different class timings'
          )
        }

        // Generate AI-like reason
        const reason = generateConnectionReason(student, match, reasons)

        return {
          student: match,
          score,
          reason,
          matchFactors: reasons,
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, validatedParams.limit)

    return NextResponse.json({
      targetStudent: {
        id: student.id,
        name: student.name,
        level: student.currentLevel,
      },
      suggestions: scoredMatches,
      total: scoredMatches.length,
    })
  } catch (error) {
    console.error('Failed to suggest connections:', error)
    return NextResponse.json(
      { error: 'Failed to suggest connections' },
      { status: 500 }
    )
  }
}

// Helper functions
function getAdjacentLevels(level: Level): Level[] {
  const levels: Level[] = [
    Level.NEW,
    Level.A1,
    Level.A1_HYBRID,
    Level.A1_HYBRID_MALAYALAM,
    Level.A2,
    Level.B1,
    Level.B2,
    Level.SPOKEN_GERMAN,
  ]

  const currentIndex = levels.indexOf(level)
  if (currentIndex === -1) return [level]

  const adjacent = [level]
  if (currentIndex > 0) adjacent.push(levels[currentIndex - 1])
  if (currentIndex < levels.length - 1) adjacent.push(levels[currentIndex + 1])

  return adjacent
}

function generateConnectionReason(
  student1: any,
  student2: any,
  factors: string[]
): string {
  // Create a natural-sounding reason for the connection
  const templates = [
    `${student2.name} would be a great connection for ${student1.name}. ${factors.join(', and ')}. They could share study tips and motivate each other.`,
    `I recommend connecting ${student1.name} with ${student2.name}. ${factors.join(', ')}. This could create a valuable peer learning opportunity.`,
    `${student2.name} and ${student1.name} would make great study partners. ${factors.join(', ')}. They're on similar learning journeys.`,
  ]

  return templates[Math.floor(Math.random() * templates.length)]
}
