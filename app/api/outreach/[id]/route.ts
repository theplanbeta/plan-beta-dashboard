import { NextRequest, NextResponse } from 'next/server'
import { checkPermission } from '@/lib/api-permissions'
import { prisma } from '@/lib/prisma'
import { updateCallSchema } from '@/lib/outreach-validation'
import { z } from 'zod'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

// GET /api/outreach/[id] - Get full call details with student context
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const check = await checkPermission('outreach', 'read')
    if (!check.authorized) return check.response

    const { id } = await context.params

    const call = await prisma.outreachCall.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            batch: {
              select: {
                batchCode: true,
                level: true,
                timing: true,
                schedule: true,
                teacher: {
                  select: {
                    name: true,
                    email: true,
                    whatsapp: true,
                  },
                },
              },
            },
            attendance: {
              orderBy: { date: 'desc' },
              take: 10,
              select: {
                date: true,
                status: true,
                notes: true,
              },
            },
            payments: {
              orderBy: { paymentDate: 'desc' },
              select: {
                id: true,
                amount: true,
                paymentDate: true,
                status: true,
                currency: true,
                method: true,
              },
            },
            interactions: {
              orderBy: { createdAt: 'desc' },
              take: 10,
              select: {
                id: true,
                interactionType: true,
                category: true,
                notes: true,
                outcome: true,
                createdAt: true,
                userName: true,
              },
            },
            outreachCalls: {
              where: {
                id: { not: id },
                status: 'COMPLETED',
              },
              orderBy: { completedAt: 'desc' },
              take: 5,
              select: {
                id: true,
                scheduledDate: true,
                completedAt: true,
                callType: true,
                sentiment: true,
                callNotes: true,
                journeyUpdates: true,
              },
            },
            communityConnections: {
              include: {
                connectedStudent: {
                  select: {
                    id: true,
                    name: true,
                    currentLevel: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    return NextResponse.json(call)
  } catch (error) {
    console.error('Failed to fetch call:', error)
    return NextResponse.json(
      { error: 'Failed to fetch call' },
      { status: 500 }
    )
  }
}

// PATCH /api/outreach/[id] - Update call details
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const check = await checkPermission('outreach', 'update')
    if (!check.authorized) return check.response

    const { id } = await context.params
    const body = await request.json()

    // Validate input
    let validatedData: z.infer<typeof updateCallSchema>
    try {
      validatedData = updateCallSchema.parse(body)
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
      where: { id },
    })

    if (!existingCall) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    // Don't allow updating completed calls
    if (existingCall.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot update a completed call' },
        { status: 400 }
      )
    }

    // Update the call
    const updatedData: any = {}

    if (validatedData.priority) {
      updatedData.priority = validatedData.priority
    }

    if (validatedData.purpose) {
      updatedData.purpose = validatedData.purpose
    }

    if (validatedData.preCallNotes !== undefined) {
      updatedData.preCallNotes = validatedData.preCallNotes
    }

    if (validatedData.scheduledDate) {
      updatedData.scheduledDate = new Date(validatedData.scheduledDate)
    }

    if (validatedData.status) {
      updatedData.status = validatedData.status
    }

    const call = await prisma.outreachCall.update({
      where: { id },
      data: updatedData,
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

    return NextResponse.json(call)
  } catch (error) {
    console.error('Failed to update call:', error)
    return NextResponse.json(
      { error: 'Failed to update call' },
      { status: 500 }
    )
  }
}
