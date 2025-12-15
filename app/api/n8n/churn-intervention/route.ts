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

    // TODO: ChurnIntervention model not yet implemented in Prisma schema
    // This is a stub response until the feature is fully implemented

    // Get student info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        studentId: true,
        name: true,
        whatsapp: true,
        email: true,
      },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Return stub response
    return NextResponse.json({
      success: true,
      intervention: {
        id: `stub-${Date.now()}`,
        studentId,
        studentName: student.name,
        tier,
        status: "INITIATED",
        createdAt: new Date().toISOString(),
      },
      message: "Churn intervention created (stub - feature not fully implemented)",
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

    // TODO: ChurnIntervention model not yet implemented in Prisma schema
    // This is a stub response until the feature is fully implemented

    return NextResponse.json({
      success: true,
      intervention: {
        id: interventionId,
        studentName: "Stub Student",
        status: updates.status || "INITIATED",
        resolved: updates.resolved || false,
        updatedAt: new Date().toISOString(),
      },
      message: "Churn intervention updated (stub - feature not fully implemented)",
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

    // TODO: ChurnIntervention model not yet implemented in Prisma schema
    // This is a stub response until the feature is fully implemented

    return NextResponse.json({
      success: true,
      intervention: {
        id,
        status: "INITIATED",
        resolved: false,
        message: "Stub - feature not fully implemented",
      },
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
