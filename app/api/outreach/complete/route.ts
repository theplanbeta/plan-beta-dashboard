import { NextRequest, NextResponse } from 'next/server'
import { checkPermission } from '@/lib/api-permissions'
import { prisma } from '@/lib/prisma'
import { completeCallSchema } from '@/lib/outreach-validation'
import { z } from 'zod'

// POST /api/outreach/complete - Mark call as completed
export async function POST(request: NextRequest) {
  try {
    const check = await checkPermission('outreach', 'update')
    if (!check.authorized) return check.response

    const body = await request.json()

    // Validate input
    let validatedData: z.infer<typeof completeCallSchema>
    try {
      validatedData = completeCallSchema.parse(body)
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
      include: {
        student: true,
      },
    })

    if (!existingCall) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    // Don't allow completing already completed calls
    if (existingCall.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Call is already completed' },
        { status: 400 }
      )
    }

    const now = new Date()
    const userId = check.session.user.id
    const userName = check.session.user.id // In production, fetch from user table

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update the call
      const updatedCall = await tx.outreachCall.update({
        where: { id: validatedData.callId },
        data: {
          status: 'COMPLETED',
          completedAt: now,
          completedBy: userId,
          completedByName: userName,
          duration: validatedData.duration,
          callNotes: validatedData.callNotes,
          journeyUpdates: validatedData.journeyUpdates || {},
          sentiment: validatedData.sentiment,
          nextCallDate: validatedData.nextCallDate
            ? new Date(validatedData.nextCallDate)
            : null,
        },
      })

      // 2. Update student's lastOutreachCall and relationshipDepth
      const updatedStudent = await tx.student.update({
        where: { id: existingCall.studentId },
        data: {
          lastOutreachCall: now,
          relationshipDepth: {
            increment: 1, // Increment depth with each completed call
          },
        },
      })

      // 3. Schedule next call automatically if requested
      let nextCall = null
      if (
        validatedData.scheduleNextCall &&
        validatedData.nextCallDate &&
        validatedData.sentiment
      ) {
        // Determine priority based on sentiment
        let priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'
        if (
          validatedData.sentiment === 'NEGATIVE' ||
          validatedData.sentiment === 'VERY_NEGATIVE'
        ) {
          priority = 'HIGH'
        } else if (
          validatedData.sentiment === 'VERY_POSITIVE' ||
          validatedData.sentiment === 'POSITIVE'
        ) {
          priority = 'LOW'
        }

        // Determine call type based on student data
        let callType: string = 'CHECK_IN'
        if (updatedStudent.relationshipDepth <= 2) {
          callType = 'ONBOARDING'
        } else if (updatedStudent.relationshipDepth % 5 === 0) {
          callType = 'MILESTONE'
        }

        nextCall = await tx.outreachCall.create({
          data: {
            studentId: existingCall.studentId,
            scheduledDate: new Date(validatedData.nextCallDate),
            priority,
            status: 'PENDING',
            callType: callType as any,
            purpose: `Follow-up after ${existingCall.callType.toLowerCase()} call`,
            preCallNotes: `Previous call sentiment: ${validatedData.sentiment}. Relationship depth: ${updatedStudent.relationshipDepth}`,
            createdBy: userId,
            createdByName: userName,
          },
        })
      }

      return {
        call: updatedCall,
        student: updatedStudent,
        nextCall,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Call completed successfully',
      data: result,
    })
  } catch (error) {
    console.error('Failed to complete call:', error)
    return NextResponse.json(
      { error: 'Failed to complete call' },
      { status: 500 }
    )
  }
}
