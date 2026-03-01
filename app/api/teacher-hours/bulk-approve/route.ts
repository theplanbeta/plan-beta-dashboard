import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logSuccess } from '@/lib/audit'
import { AuditAction } from '@prisma/client'

// POST /api/teacher-hours/bulk-approve - Bulk approve or reject multiple hour entries
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'FOUNDER') {
      return NextResponse.json(
        { error: 'Only founders can approve/reject hours' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { ids, action, rejectionReason } = body as {
      ids: string[]
      action: 'APPROVED' | 'REJECTED'
      rejectionReason?: string
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one entry ID is required' },
        { status: 400 }
      )
    }

    if (!action || !['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be APPROVED or REJECTED' },
        { status: 400 }
      )
    }

    if (action === 'REJECTED' && !rejectionReason?.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    // Fetch all entries and validate they exist and are PENDING
    const entries = await prisma.teacherHours.findMany({
      where: { id: { in: ids } },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
      },
    })

    if (entries.length !== ids.length) {
      const foundIds = new Set(entries.map((e) => e.id))
      const missing = ids.filter((id) => !foundIds.has(id))
      return NextResponse.json(
        { error: `Entries not found: ${missing.join(', ')}` },
        { status: 404 }
      )
    }

    const nonPending = entries.filter((e) => e.status !== 'PENDING')
    if (nonPending.length > 0) {
      return NextResponse.json(
        {
          error: `${nonPending.length} entries are not in PENDING status and cannot be ${action.toLowerCase()}`,
        },
        { status: 400 }
      )
    }

    // Update all entries atomically
    const now = new Date()
    await prisma.$transaction(
      entries.map((entry) =>
        prisma.teacherHours.update({
          where: { id: entry.id },
          data: {
            status: action,
            approvedBy: session.user.id,
            approvedAt: now,
            rejectionReason: action === 'REJECTED' ? rejectionReason!.trim() : null,
          },
        })
      )
    )

    const totalHours = entries.reduce(
      (sum, e) => sum + Number(e.hoursWorked),
      0
    )
    const totalAmount = entries.reduce(
      (sum, e) => sum + Number(e.totalAmount),
      0
    )

    // Audit log
    const teacherNames = [
      ...new Set(entries.map((e) => e.teacher?.name).filter(Boolean)),
    ].join(', ')

    await logSuccess(
      action === 'APPROVED'
        ? AuditAction.TEACHER_HOURS_APPROVED
        : AuditAction.TEACHER_HOURS_REJECTED,
      `Bulk ${action.toLowerCase()} ${entries.length} hour entries for ${teacherNames} (${totalHours.toFixed(1)}h, INR ${totalAmount.toFixed(2)})`,
      {
        entityType: 'TeacherHours',
        metadata: {
          action,
          entryIds: ids,
          entriesCount: entries.length,
          teacherNames,
          totalHours,
          totalAmount,
          rejectionReason: action === 'REJECTED' ? rejectionReason : undefined,
        },
        request,
      }
    )

    return NextResponse.json({
      success: true,
      updatedCount: entries.length,
      totalHours,
      totalAmount,
      message: `Successfully ${action.toLowerCase()} ${entries.length} hour entries`,
    })
  } catch (error) {
    console.error('Error bulk approving/rejecting hours:', error)
    return NextResponse.json(
      {
        error: 'Failed to process entries',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
