import { NextRequest, NextResponse } from 'next/server'
import { checkPermission } from '@/lib/api-permissions'
import { prisma } from '@/lib/prisma'
import { scheduledCallsQuerySchema } from '@/lib/outreach-validation'
import { z } from 'zod'

// GET /api/outreach/scheduled - Get today's scheduled calls with full student context
export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission('outreach', 'read')
    if (!check.authorized) return check.response

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    // Validate query params
    let validatedParams: z.infer<typeof scheduledCallsQuerySchema>
    try {
      validatedParams = scheduledCallsQuerySchema.parse({
        date: dateParam || undefined,
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

    // Determine target date (today or specified date)
    const targetDate = validatedParams.date
      ? new Date(validatedParams.date)
      : new Date()

    // Set to start of day
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)

    // Set to end of day
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Fetch scheduled calls for the target date
    const calls = await prisma.outreachCall.findMany({
      where: {
        scheduledDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ['PENDING', 'SNOOZED'],
        },
      },
      include: {
        student: {
          include: {
            batch: {
              select: {
                batchCode: true,
                level: true,
                timing: true,
                teacher: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
            attendance: {
              orderBy: { date: 'desc' },
              take: 5,
              select: {
                date: true,
                status: true,
              },
            },
            payments: {
              orderBy: { paymentDate: 'desc' },
              take: 3,
              select: {
                id: true,
                amount: true,
                paymentDate: true,
                status: true,
                currency: true,
              },
            },
            interactions: {
              orderBy: { createdAt: 'desc' },
              take: 5,
              select: {
                id: true,
                interactionType: true,
                category: true,
                notes: true,
                createdAt: true,
                userName: true,
              },
            },
          },
        },
      },
      orderBy: [
        // Priority sorting: HIGH > MEDIUM > LOW
        {
          priority: 'desc',
        },
        {
          scheduledDate: 'asc',
        },
      ],
    })

    // Calculate additional context for each call
    const callsWithContext = calls.map((call) => ({
      ...call,
      student: {
        ...call.student,
        // Add computed fields
        daysUntilNextPayment: calculateDaysUntilNextPayment(call.student),
        recentAttendanceRate: calculateRecentAttendanceRate(
          call.student.attendance
        ),
        lastInteractionDate:
          call.student.interactions[0]?.createdAt || call.student.enrollmentDate,
      },
    }))

    return NextResponse.json({
      date: targetDate.toISOString().split('T')[0],
      totalCalls: callsWithContext.length,
      byPriority: {
        HIGH: callsWithContext.filter((c) => c.priority === 'HIGH').length,
        MEDIUM: callsWithContext.filter((c) => c.priority === 'MEDIUM').length,
        LOW: callsWithContext.filter((c) => c.priority === 'LOW').length,
      },
      calls: callsWithContext,
    })
  } catch (error) {
    console.error('Failed to fetch scheduled calls:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduled calls' },
      { status: 500 }
    )
  }
}

// Helper functions
function calculateDaysUntilNextPayment(student: any): number | null {
  if (student.paymentStatus === 'PAID') return null

  // If there's a balance, calculate based on enrollment date + 30 days
  const nextPaymentDate = new Date(student.enrollmentDate)
  nextPaymentDate.setDate(nextPaymentDate.getDate() + 30)

  const today = new Date()
  const diffTime = nextPaymentDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

function calculateRecentAttendanceRate(
  attendance: Array<{ status: string }>
): number {
  if (attendance.length === 0) return 0

  const presentCount = attendance.filter((a) => a.status === 'PRESENT').length
  return Math.round((presentCount / attendance.length) * 100)
}
