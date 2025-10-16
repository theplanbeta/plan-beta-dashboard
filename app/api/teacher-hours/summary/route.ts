import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Prisma } from '@prisma/client'

const Decimal = Prisma.Decimal

// GET /api/teacher-hours/summary - Get summary of hours for a teacher
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const teacherId = searchParams.get('teacherId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Permission check
    const isTeacher = session.user.role === 'TEACHER'
    const isFounder = session.user.role === 'FOUNDER'

    if (!isTeacher && !isFounder) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Determine which teacher to fetch summary for
    let targetTeacherId: string | undefined
    if (isTeacher) {
      targetTeacherId = session.user.id
    } else if (teacherId) {
      targetTeacherId = teacherId
    }
    // If founder and no teacherId, fetch summary for ALL teachers

    // Build date filter
    const dateFilter: any = {}
    if (startDate || endDate) {
      if (startDate) {
        dateFilter.gte = new Date(startDate)
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate)
      }
    }

    // Build where clause
    const where: any = {
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
    }

    // Only filter by teacherId if specified
    if (targetTeacherId) {
      where.teacherId = targetTeacherId
    }

    // Fetch all hour entries
    const hours = await prisma.teacherHours.findMany({
      where,
      select: {
        id: true,
        hoursWorked: true,
        totalAmount: true,
        status: true,
        paid: true,
        paidAmount: true,
      },
    })

    // Calculate summary statistics
    let totalHours = new Decimal(0)
    let totalAmount = new Decimal(0)
    let pendingHours = new Decimal(0)
    let pendingAmount = new Decimal(0)
    let approvedHours = new Decimal(0)
    let approvedAmount = new Decimal(0)
    let rejectedHours = new Decimal(0)
    let rejectedAmount = new Decimal(0)
    let paidAmount = new Decimal(0)
    let unpaidAmount = new Decimal(0)

    hours.forEach((entry) => {
      const hours = new Decimal(entry.hoursWorked.toString())
      const amount = new Decimal(entry.totalAmount.toString())

      totalHours = totalHours.plus(hours)
      totalAmount = totalAmount.plus(amount)

      if (entry.status === 'PENDING') {
        pendingHours = pendingHours.plus(hours)
        pendingAmount = pendingAmount.plus(amount)
      } else if (entry.status === 'APPROVED') {
        approvedHours = approvedHours.plus(hours)
        approvedAmount = approvedAmount.plus(amount)

        if (entry.paid) {
          paidAmount = paidAmount.plus(
            new Decimal((entry.paidAmount || entry.totalAmount).toString())
          )
        } else {
          unpaidAmount = unpaidAmount.plus(amount)
        }
      } else if (entry.status === 'REJECTED') {
        rejectedHours = rejectedHours.plus(hours)
        rejectedAmount = rejectedAmount.plus(amount)
      }
    })

    const summary = {
      teacherId: targetTeacherId || null,
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      total: {
        count: hours.length,
        totalHours: Number(totalHours),
        totalAmount: Number(totalAmount),
      },
      pending: {
        count: hours.filter((h) => h.status === 'PENDING').length,
        totalHours: Number(pendingHours),
        totalAmount: Number(pendingAmount),
      },
      approved: {
        count: hours.filter((h) => h.status === 'APPROVED').length,
        totalHours: Number(approvedHours),
        totalAmount: Number(approvedAmount),
      },
      rejected: {
        count: hours.filter((h) => h.status === 'REJECTED').length,
        totalHours: Number(rejectedHours),
        totalAmount: Number(rejectedAmount),
      },
      paid: {
        count: hours.filter((h) => h.paid).length,
        totalHours: Number(hours.filter((h) => h.paid).reduce((sum, h) => sum + Number(h.hoursWorked), 0)),
        totalAmount: Number(paidAmount),
      },
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error fetching hours summary:', error)
    return NextResponse.json({ error: 'Failed to fetch hours summary' }, { status: 500 })
  }
}
