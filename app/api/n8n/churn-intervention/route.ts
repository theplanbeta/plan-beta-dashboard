import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schema for creating intervention
const createInterventionSchema = z.object({
  studentId: z.string(),
  consecutiveAbsences: z.number(),
  tier: z.number().min(1).max(3),
})

// Schema for updating intervention
const updateInterventionSchema = z.object({
  interventionId: z.string(),
  whatsappSent: z.boolean().optional(),
  whatsappDelivered: z.boolean().optional(),
  whatsappRead: z.boolean().optional(),
  whatsappReplied: z.boolean().optional(),
  smsSent: z.boolean().optional(),
  smsDelivered: z.boolean().optional(),
  emailSent: z.boolean().optional(),
  followUpScheduled: z.boolean().optional(),
  followUpScheduledAt: z.string().optional(),
  adminTaskCreated: z.boolean().optional(),
  adminTaskAssignedTo: z.string().optional(),
  retentionOfferSent: z.boolean().optional(),
  retentionOfferType: z.string().optional(),
  retentionOfferAccepted: z.boolean().optional(),
  exitSurveyInvited: z.boolean().optional(),
  status: z
    .enum(["INITIATED", "IN_PROGRESS", "AWAITING_RESPONSE", "ESCALATED", "RESOLVED", "FAILED"])
    .optional(),
  resolved: z.boolean().optional(),
  resolutionType: z.enum(["RETURNED", "DROPPED", "ONGOING"]).optional(),
  notes: z.string().optional(),
})

/**
 * POST /api/n8n/churn-intervention
 * Create a new churn intervention record
 */
export async function POST(request: NextRequest) {
  try {
    // Security check
    const apiKey = request.headers.get("x-n8n-api-key")
    if (apiKey !== process.env.N8N_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validation = createInterventionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const { studentId, consecutiveAbsences, tier } = validation.data

    // Create intervention record
    const intervention = await prisma.churnIntervention.create({
      data: {
        studentId,
        consecutiveAbsences,
        tier,
        status: "INITIATED",
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            name: true,
            whatsapp: true,
            email: true,
          },
        },
      },
    })

    // Update student's last intervention timestamp
    await prisma.student.update({
      where: { id: studentId },
      data: {
        lastChurnInterventionAt: new Date(),
        totalChurnInterventions: { increment: 1 },
      },
    })

    return NextResponse.json({
      success: true,
      intervention: {
        id: intervention.id,
        studentId: intervention.studentId,
        studentName: intervention.student.name,
        tier: intervention.tier,
        status: intervention.status,
        createdAt: intervention.createdAt,
      },
      message: "Churn intervention created successfully",
    })
  } catch (error) {
    console.error("Error creating churn intervention:", error)
    return NextResponse.json(
      {
        error: "Failed to create intervention",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/n8n/churn-intervention
 * Update an existing churn intervention record
 */
export async function PATCH(request: NextRequest) {
  try {
    // Security check
    const apiKey = request.headers.get("x-n8n-api-key")
    if (apiKey !== process.env.N8N_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validation = updateInterventionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const { interventionId, ...updates } = validation.data

    // Build update object with timestamps
    const updateData: any = { ...updates }

    if (updates.whatsappSent && !updates.whatsappSent === false) {
      updateData.whatsappSentAt = new Date()
    }
    if (updates.whatsappRead && !updates.whatsappRead === false) {
      updateData.whatsappReadAt = new Date()
    }
    if (updates.smsSent && !updates.smsSent === false) {
      updateData.smsSentAt = new Date()
    }
    if (updates.emailSent && !updates.emailSent === false) {
      updateData.emailSentAt = new Date()
    }
    if (updates.adminTaskCreated && !updates.adminTaskCreated === false) {
      updateData.adminTaskCreatedAt = new Date()
    }
    if (updates.retentionOfferAccepted && !updates.retentionOfferAccepted === false) {
      updateData.retentionOfferAcceptedAt = new Date()
    }
    if (updates.exitSurveyInvited && !updates.exitSurveyInvited === false) {
      updateData.exitSurveyInvitedAt = new Date()
    }
    if (updates.resolved && !updates.resolved === false) {
      updateData.resolvedAt = new Date()
    }

    // Update intervention
    const intervention = await prisma.churnIntervention.update({
      where: { id: interventionId },
      data: updateData,
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            name: true,
          },
        },
      },
    })

    // If resolved, update student's churn risk
    if (updates.resolved && updates.resolutionType === "RETURNED") {
      await prisma.student.update({
        where: { id: intervention.studentId },
        data: {
          consecutiveAbsences: 0,
          churnRisk: "LOW",
          churnMitigatedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      intervention: {
        id: intervention.id,
        studentName: intervention.student.name,
        status: intervention.status,
        resolved: intervention.resolved,
        updatedAt: intervention.updatedAt,
      },
      message: "Churn intervention updated successfully",
    })
  } catch (error) {
    console.error("Error updating churn intervention:", error)
    return NextResponse.json(
      {
        error: "Failed to update intervention",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/n8n/churn-intervention/:id
 * Get intervention details
 */
export async function GET(request: NextRequest) {
  try {
    // Security check
    const apiKey = request.headers.get("x-n8n-api-key")
    if (apiKey !== process.env.N8N_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Intervention ID required" }, { status: 400 })
    }

    const intervention = await prisma.churnIntervention.findUnique({
      where: { id },
      include: {
        student: true,
      },
    })

    if (!intervention) {
      return NextResponse.json({ error: "Intervention not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      intervention,
    })
  } catch (error) {
    console.error("Error fetching intervention:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch intervention",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
