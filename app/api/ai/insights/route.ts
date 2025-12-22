import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isOllamaAvailable, generateInsights, askQuestion, type InsightType } from '@/lib/ollama'

// Simple in-memory cache (in production, use Redis or DB)
const insightsCache: Map<string, { data: string; timestamp: number }> = new Map()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

/**
 * Aggregate business data for AI analysis
 */
async function aggregateBusinessData(period: number = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - period)

  const [
    students,
    leads,
    payments,
    batches,
    attendance,
    teacherHours,
  ] = await Promise.all([
    // Students summary
    prisma.student.findMany({
      select: {
        id: true,
        currentLevel: true,
        completionStatus: true,
        churnRisk: true,
        paymentStatus: true,
        attendanceRate: true,
        enrollmentDate: true,
        totalPaidEur: true,
        balance: true,
        isCombo: true,
        referralSource: true,
      },
    }),
    // Leads summary
    prisma.lead.findMany({
      where: { createdAt: { gte: startDate } },
      select: {
        id: true,
        source: true,
        quality: true,
        status: true,
        converted: true,
        createdAt: true,
      },
    }),
    // Payments in period
    prisma.payment.findMany({
      where: {
        paymentDate: { gte: startDate },
        status: 'COMPLETED',
      },
      select: {
        amount: true,
        currency: true,
        paymentDate: true,
      },
    }),
    // Batches
    prisma.batch.findMany({
      where: { status: { in: ['RUNNING', 'FILLING'] } },
      select: {
        batchCode: true,
        level: true,
        timing: true,
        totalSeats: true,
        _count: { select: { students: true } },
      },
    }),
    // Attendance in period
    prisma.attendance.findMany({
      where: { date: { gte: startDate } },
      select: { status: true, date: true },
    }),
    // Teacher hours in period
    prisma.teacherHours.findMany({
      where: { date: { gte: startDate } },
      select: { totalAmount: true, paid: true },
    }),
  ])

  // Aggregate students
  const totalStudents = students.length
  const activeStudents = students.filter(s => s.completionStatus === 'ACTIVE').length
  const newEnrollments = students.filter(s =>
    new Date(s.enrollmentDate) >= startDate
  ).length
  const droppedStudents = students.filter(s => s.completionStatus === 'DROPPED').length

  const studentsByLevel: Record<string, number> = {}
  const studentsByRisk: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 }
  const studentsByPayment: Record<string, number> = { PAID: 0, PARTIAL: 0, PENDING: 0, OVERDUE: 0 }
  const studentsBySource: Record<string, number> = {}

  for (const s of students) {
    studentsByLevel[s.currentLevel] = (studentsByLevel[s.currentLevel] || 0) + 1
    if (s.churnRisk) studentsByRisk[s.churnRisk]++
    if (s.paymentStatus) studentsByPayment[s.paymentStatus]++
    if (s.referralSource) {
      studentsBySource[s.referralSource] = (studentsBySource[s.referralSource] || 0) + 1
    }
  }

  const avgAttendanceRate = students.length > 0
    ? students.reduce((sum, s) => sum + Number(s.attendanceRate || 0), 0) / students.length
    : 0

  // Aggregate leads
  const totalLeads = leads.length
  const convertedLeads = leads.filter(l => l.converted).length
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0

  const leadsBySource: Record<string, { total: number; converted: number }> = {}
  const leadsByQuality: Record<string, number> = { HOT: 0, WARM: 0, COLD: 0 }
  const leadsByStatus: Record<string, number> = {}

  for (const l of leads) {
    if (!leadsBySource[l.source]) {
      leadsBySource[l.source] = { total: 0, converted: 0 }
    }
    leadsBySource[l.source].total++
    if (l.converted) leadsBySource[l.source].converted++
    if (l.quality) leadsByQuality[l.quality]++
    leadsByStatus[l.status] = (leadsByStatus[l.status] || 0) + 1
  }

  // Aggregate revenue
  const totalRevenue = payments.reduce((sum, p) => {
    const amount = Number(p.amount)
    // Convert INR to EUR roughly
    return sum + (p.currency === 'INR' ? amount / 90 : amount)
  }, 0)

  // Aggregate batches
  const batchData = batches.map(b => ({
    code: b.batchCode,
    level: b.level,
    timing: b.timing,
    seats: b.totalSeats,
    enrolled: b._count.students,
    fillRate: b.totalSeats > 0 ? (b._count.students / b.totalSeats) * 100 : 0,
  }))

  const avgFillRate = batchData.length > 0
    ? batchData.reduce((sum, b) => sum + b.fillRate, 0) / batchData.length
    : 0

  const underperformingBatches = batchData
    .filter(b => b.fillRate < 50)
    .map(b => b.code)

  // Aggregate attendance
  const attendanceByStatus: Record<string, number> = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 }
  for (const a of attendance) {
    attendanceByStatus[a.status]++
  }
  const totalAttendanceRecords = attendance.length
  const attendanceRate = totalAttendanceRecords > 0
    ? ((attendanceByStatus.PRESENT + attendanceByStatus.LATE) / totalAttendanceRecords) * 100
    : 0

  // Aggregate teacher costs
  const teacherCosts = teacherHours.reduce((sum, h) => sum + Number(h.totalAmount || 0), 0)
  const unpaidTeacherCosts = teacherHours
    .filter(h => !h.paid)
    .reduce((sum, h) => sum + Number(h.totalAmount || 0), 0)

  return {
    period: `Last ${period} days`,
    generatedAt: new Date().toISOString(),
    students: {
      total: totalStudents,
      active: activeStudents,
      newEnrollments,
      dropped: droppedStudents,
      byLevel: studentsByLevel,
      byChurnRisk: studentsByRisk,
      byPaymentStatus: studentsByPayment,
      bySource: studentsBySource,
      avgAttendanceRate: Math.round(avgAttendanceRate),
      comboStudents: students.filter(s => s.isCombo).length,
    },
    leads: {
      total: totalLeads,
      converted: convertedLeads,
      conversionRate: Math.round(conversionRate),
      bySource: leadsBySource,
      byQuality: leadsByQuality,
      byStatus: leadsByStatus,
    },
    revenue: {
      totalEUR: Math.round(totalRevenue),
      paymentsCount: payments.length,
    },
    batches: {
      active: batches.length,
      avgFillRate: Math.round(avgFillRate),
      underperforming: underperformingBatches,
      details: batchData,
    },
    attendance: {
      rate: Math.round(attendanceRate),
      byStatus: attendanceByStatus,
      totalRecords: totalAttendanceRecords,
    },
    costs: {
      teacherTotal: Math.round(teacherCosts),
      teacherUnpaid: Math.round(unpaidTeacherCosts),
    },
    alerts: {
      highChurnRisk: studentsByRisk.HIGH,
      overduePayments: studentsByPayment.OVERDUE,
      lowAttendanceStudents: students.filter(s => Number(s.attendanceRate) < 60).length,
    },
  }
}

// GET /api/ai/insights - Get AI-powered insights
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = (searchParams.get('type') || 'daily_digest') as InsightType
    const period = parseInt(searchParams.get('period') || '30')
    const skipCache = searchParams.get('refresh') === 'true'

    // Check if Ollama is available
    const ollamaAvailable = await isOllamaAvailable()
    if (!ollamaAvailable) {
      return NextResponse.json({
        error: 'AI service unavailable',
        message: 'Ollama is not running. Start it with: ollama serve',
        fallback: true,
      }, { status: 503 })
    }

    // Check cache
    const cacheKey = `${type}-${period}`
    const cached = insightsCache.get(cacheKey)
    if (!skipCache && cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        insights: cached.data,
        cached: true,
        generatedAt: new Date(cached.timestamp).toISOString(),
      })
    }

    // Aggregate data
    const data = await aggregateBusinessData(period)

    // Generate insights
    const insights = await generateInsights(data, type)

    // Cache result
    insightsCache.set(cacheKey, {
      data: insights,
      timestamp: Date.now(),
    })

    return NextResponse.json({
      insights,
      cached: false,
      generatedAt: new Date().toISOString(),
      dataSnapshot: data,
    })
  } catch (error) {
    console.error('Error generating AI insights:', error)
    return NextResponse.json({
      error: 'Failed to generate insights',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

// POST /api/ai/insights - Ask a specific question
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { question, period = 30 } = body

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    // Check if Ollama is available
    const ollamaAvailable = await isOllamaAvailable()
    if (!ollamaAvailable) {
      return NextResponse.json({
        error: 'AI service unavailable',
        message: 'Ollama is not running. Start it with: ollama serve',
      }, { status: 503 })
    }

    // Aggregate data
    const data = await aggregateBusinessData(period)

    // Answer question
    const answer = await askQuestion(question, data)

    return NextResponse.json({
      question,
      answer,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error answering question:', error)
    return NextResponse.json({
      error: 'Failed to answer question',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
