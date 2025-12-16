import { NextRequest, NextResponse } from 'next/server'
import { checkPermission } from '@/lib/api-permissions'
import { prisma } from '@/lib/prisma'
import { snoozeCallSchema } from '@/lib/outreach-validation'
import { z } from 'zod'

// POST /api/outreach/snooze - Snooze a call to a later date
export async function POST(request: NextRequest) {
  try {
    const check = await checkPermission('outreach', 'update')
    if (!check.authorized) return check.response

    const body = await request.json()

    // Validate input
    let validatedData: z.infer<typeof snoozeCallSchema>
    try {
      validatedData = snoozeCallSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid input', details: error.issues },
          { status: 400 }
        )
      }
      throw error
    }

    // Check if call exists
    const existingCall = await prisma.outreachCall.findUnique({
      where: { id: validatedData.callId },
    })

    if (!existingCall) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    // Don't allow snoozing completed calls
    if (existingCall.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot snooze a completed call' },
        { status: 400 }
      )
    }

    // Validate snooze date is in the future
    const snoozeDate = new Date(validatedData.snoozeUntil)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (snoozeDate < today) {
      return NextResponse.json(
        { error: 'Snooze date must be in the future' },
        { status: 400 }
      )
    }

    // Update the call
    const updateData: any = {
      status: 'SNOOZED',
      snoozedUntil: snoozeDate,
      snoozeReason: validatedData.snoozeReason,
      scheduledDate: snoozeDate, // Update scheduled date to snooze date
    }

    // Increment attempt counter if not reachable
    if (validatedData.notReachable) {
      updateData.attemptCount = {
        increment: 1,
      }
    }

    const call = await prisma.outreachCall.update({
      where: { id: validatedData.callId },
      data: updateData,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            whatsapp: true,
            email: true,
            currentLevel: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Call snoozed successfully',
      data: call,
    })
  } catch (error) {
    console.error('Failed to snooze call:', error)
    return NextResponse.json(
      { error: 'Failed to snooze call' },
      { status: 500 }
    )
  }
}
