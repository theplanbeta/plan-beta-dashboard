import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'FOUNDER') {
      return NextResponse.json(
        { error: "Unauthorized - Founder access only" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view') || 'today' // today, week, all

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(today)
    endOfToday.setDate(endOfToday.getDate() + 1)

    const endOfWeek = new Date(today)
    endOfWeek.setDate(endOfWeek.getDate() + 7)

    // Get students who need calls based on various criteria
    const students = await prisma.student.findMany({
      where: {
        completionStatus: 'ACTIVE',
        OR: [
          // High churn risk students
          { churnRisk: 'HIGH' },
          // Students with consecutive absences
          { consecutiveAbsences: { gte: 2 } },
          // Students with pending/overdue payments
          { paymentStatus: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] } },
          // Students with low attendance
          { attendanceRate: { lt: 70 } },
          // Students who haven't had recent interaction
          {
            interactions: {
              none: {
                createdAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days
                }
              }
            }
          }
        ]
      },
      include: {
        batch: {
          include: {
            teacher: {
              select: {
                name: true
              }
            }
          }
        },
        interactions: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        },
        attendance: {
          orderBy: {
            date: 'desc'
          },
          take: 10
        },
        payments: {
          orderBy: {
            paymentDate: 'desc'
          },
          take: 3
        }
      },
      orderBy: [
        { churnRisk: 'desc' },
        { consecutiveAbsences: 'desc' },
        { attendanceRate: 'asc' }
      ]
    })

    // Transform students into scheduled calls with priority and reason
    const calls = students.map(student => {
      const reasons: string[] = []
      let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW'
      let callType: 'URGENT' | 'CHECK_IN' | 'PAYMENT' | 'ATTENDANCE' = 'CHECK_IN'

      // Determine priority and reasons
      if (student.churnRisk === 'HIGH') {
        priority = 'HIGH'
        callType = 'URGENT'
        reasons.push('High churn risk')
      }

      if (student.consecutiveAbsences >= 3) {
        priority = 'HIGH'
        callType = 'URGENT'
        reasons.push(`${student.consecutiveAbsences} consecutive absences`)
      } else if (student.consecutiveAbsences >= 2) {
        if (priority !== 'HIGH') priority = 'MEDIUM'
        callType = 'ATTENDANCE'
        reasons.push(`${student.consecutiveAbsences} consecutive absences`)
      }

      if (student.paymentStatus === 'OVERDUE') {
        if (priority === 'LOW') priority = 'MEDIUM'
        callType = 'PAYMENT'
        reasons.push('Payment overdue')
      } else if (student.paymentStatus === 'PARTIAL') {
        reasons.push('Partial payment pending')
      }

      const attendanceRate = Number(student.attendanceRate)
      if (attendanceRate < 50) {
        if (priority === 'LOW') priority = 'MEDIUM'
        reasons.push(`Low attendance (${student.attendanceRate.toString()}%)`)
      } else if (attendanceRate < 70) {
        reasons.push(`Below-average attendance (${student.attendanceRate.toString()}%)`)
      }

      const lastInteraction = student.interactions[0]
      const daysSinceLastContact = lastInteraction
        ? Math.floor((now.getTime() - new Date(lastInteraction.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 999

      if (daysSinceLastContact > 30) {
        reasons.push(`No contact in ${daysSinceLastContact} days`)
      }

      // Generate talking points
      const talkingPoints: string[] = []

      if (student.churnRisk === 'HIGH') {
        talkingPoints.push('Check on their learning experience and any challenges')
        talkingPoints.push('Ask about their goals and progress')
      }

      if (student.consecutiveAbsences >= 2) {
        talkingPoints.push('Understand reason for recent absences')
        talkingPoints.push('Offer makeup classes if needed')
      }

      if (attendanceRate < 70) {
        talkingPoints.push('Discuss attendance patterns and challenges')
        talkingPoints.push('Share the importance of consistent practice')
      }

      if (student.paymentStatus !== 'PAID') {
        talkingPoints.push('Gentle reminder about pending payment')
        talkingPoints.push('Discuss payment plan options if needed')
      }

      talkingPoints.push('Ask about their recent wins or achievements')
      talkingPoints.push('Share encouragement and support')

      return {
        id: student.id,
        studentId: student.studentId,
        studentName: student.name,
        whatsapp: student.whatsapp,
        email: student.email,
        level: student.currentLevel,
        batch: student.batch ? {
          code: student.batch.batchCode,
          teacher: student.batch.teacher?.name
        } : null,
        priority,
        callType,
        reasons,
        talkingPoints,
        stats: {
          attendanceRate: Number(student.attendanceRate),
          consecutiveAbsences: student.consecutiveAbsences,
          classesAttended: student.classesAttended,
          totalClasses: student.totalClasses,
          paymentStatus: student.paymentStatus,
          balance: Number(student.balance),
          churnRisk: student.churnRisk
        },
        lastInteraction: lastInteraction ? {
          type: lastInteraction.interactionType,
          category: lastInteraction.category,
          date: lastInteraction.createdAt,
          notes: lastInteraction.notes,
          userName: lastInteraction.userName
        } : null,
        recentAttendance: student.attendance.slice(0, 5).map(a => ({
          date: a.date,
          status: a.status
        })),
        scheduledFor: today, // For now, all are for today
        createdAt: student.createdAt
      }
    })

    // Filter by view
    let filteredCalls = calls
    if (view === 'today') {
      // Show top priority calls for today
      filteredCalls = calls.slice(0, 20)
    } else if (view === 'week') {
      // Show all calls for the week
      filteredCalls = calls
    }

    return NextResponse.json({
      calls: filteredCalls,
      summary: {
        total: filteredCalls.length,
        high: filteredCalls.filter(c => c.priority === 'HIGH').length,
        medium: filteredCalls.filter(c => c.priority === 'MEDIUM').length,
        low: filteredCalls.filter(c => c.priority === 'LOW').length,
        byType: {
          urgent: filteredCalls.filter(c => c.callType === 'URGENT').length,
          checkIn: filteredCalls.filter(c => c.callType === 'CHECK_IN').length,
          payment: filteredCalls.filter(c => c.callType === 'PAYMENT').length,
          attendance: filteredCalls.filter(c => c.callType === 'ATTENDANCE').length
        }
      }
    })

  } catch (error) {
    console.error("Error fetching outreach calls:", error)
    return NextResponse.json(
      { error: "Failed to fetch outreach calls" },
      { status: 500 }
    )
  }
}
