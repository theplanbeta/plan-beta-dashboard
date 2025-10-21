import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Prisma } from '@prisma/client'

const Decimal = Prisma.Decimal

export interface TeacherPayrollSummary {
  teacherId: string
  teacherName: string
  teacherEmail: string
  hourlyRate: number
  totalHours: number
  totalApproved: number
  totalPaid: number
  totalUnpaid: number
  approvedHours: number
  paidHours: number
  unpaidHours: number
  batches: {
    batchId: string | null
    batchCode: string
    hours: number
    amount: number
    entriesCount: number
  }[]
}

// GET /api/teacher-hours/monthly-payroll - Get monthly payroll summary by teacher
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only founders can access payroll summary
    if (session.user.role !== 'FOUNDER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') // Format: YYYY-MM
    const year = searchParams.get('year')

    if (!month && !year) {
      return NextResponse.json(
        { error: 'Month parameter is required (format: YYYY-MM)' },
        { status: 400 }
      )
    }

    // Parse month parameter
    let startDate: Date
    let endDate: Date

    if (month) {
      const [yearStr, monthStr] = month.split('-')
      const yearNum = parseInt(yearStr)
      const monthNum = parseInt(monthStr)

      startDate = new Date(yearNum, monthNum - 1, 1, 0, 0, 0)
      endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999)
    } else if (year) {
      const yearNum = parseInt(year)
      startDate = new Date(yearNum, 0, 1, 0, 0, 0)
      endDate = new Date(yearNum, 11, 31, 23, 59, 59, 999)
    } else {
      return NextResponse.json(
        { error: 'Invalid month or year parameter' },
        { status: 400 }
      )
    }

    // Fetch all approved hours for the period
    const hours = await prisma.teacherHours.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: 'APPROVED', // Only include approved hours in payroll
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            hourlyRate: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchCode: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    })

    // Group by teacher
    const teacherMap = new Map<string, TeacherPayrollSummary>()

    hours.forEach((entry) => {
      const teacherId = entry.teacherId
      const teacher = entry.teacher

      if (!teacherMap.has(teacherId)) {
        teacherMap.set(teacherId, {
          teacherId,
          teacherName: teacher.name || 'Unknown',
          teacherEmail: teacher.email,
          hourlyRate: Number(teacher.hourlyRate || 0),
          totalHours: 0,
          totalApproved: 0,
          totalPaid: 0,
          totalUnpaid: 0,
          approvedHours: 0,
          paidHours: 0,
          unpaidHours: 0,
          batches: [],
        })
      }

      const summary = teacherMap.get(teacherId)!
      const hours = Number(entry.hoursWorked)
      const amount = Number(entry.totalAmount)

      // Update totals
      summary.totalHours += hours
      summary.totalApproved += amount
      summary.approvedHours += hours

      if (entry.paid) {
        summary.totalPaid += Number(entry.paidAmount || entry.totalAmount)
        summary.paidHours += hours
      } else {
        summary.totalUnpaid += amount
        summary.unpaidHours += hours
      }

      // Update batch breakdown
      const batchCode = entry.batch?.batchCode || 'No Batch'
      const existingBatch = summary.batches.find(
        (b) => (b.batchId === entry.batchId) || (b.batchCode === batchCode && !b.batchId && !entry.batchId)
      )

      if (existingBatch) {
        existingBatch.hours += hours
        existingBatch.amount += amount
        existingBatch.entriesCount++
      } else {
        summary.batches.push({
          batchId: entry.batchId,
          batchCode,
          hours,
          amount,
          entriesCount: 1,
        })
      }
    })

    // Convert map to array and sort by total amount descending
    const payrollSummary = Array.from(teacherMap.values()).sort(
      (a, b) => b.totalApproved - a.totalApproved
    )

    // Calculate grand totals
    const grandTotal = {
      totalTeachers: payrollSummary.length,
      totalHours: payrollSummary.reduce((sum, t) => sum + t.totalHours, 0),
      totalApproved: payrollSummary.reduce((sum, t) => sum + t.totalApproved, 0),
      totalPaid: payrollSummary.reduce((sum, t) => sum + t.totalPaid, 0),
      totalUnpaid: payrollSummary.reduce((sum, t) => sum + t.totalUnpaid, 0),
    }

    return NextResponse.json({
      period: {
        month: month || undefined,
        year: year || undefined,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      teachers: payrollSummary,
      grandTotal,
    })
  } catch (error) {
    console.error('Error fetching monthly payroll:', error)
    return NextResponse.json(
      { error: 'Failed to fetch monthly payroll' },
      { status: 500 }
    )
  }
}
