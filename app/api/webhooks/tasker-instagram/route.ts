import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Validation schema for Tasker webhook
const taskerInstagramSchema = z.object({
  senderName: z.string().min(1, "Sender name required"),
  messagePreview: z.string().optional(),
  notificationType: z.enum(["MESSAGE", "COMMENT", "MENTION", "OTHER"]),
  timestamp: z.string().optional(),
  // Security token from Tasker
  secret: z.string(),
})

// GET - for testing the endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "active",
    endpoint: "/api/webhooks/tasker-instagram",
    message: "Tasker Instagram webhook is ready",
  })
}

// POST - receive notifications from Tasker
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("📱 Tasker notification received:", body)

    // Validate request
    const validation = taskerInstagramSchema.safeParse(body)
    if (!validation.success) {
      console.error("❌ Validation failed:", validation.error.issues)
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    // Verify secret token
    const expectedSecret = process.env.TASKER_WEBHOOK_SECRET || "tasker_secret_2024"
    if (data.secret !== expectedSecret) {
      console.error("❌ Invalid secret token")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if lead already exists (by name - simple approach)
    let lead = await prisma.lead.findFirst({
      where: {
        name: {
          equals: data.senderName,
          mode: 'insensitive',
        },
        source: "INSTAGRAM",
      },
    })

    if (lead) {
      // Update existing lead
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          lastContactDate: new Date(),
          contactAttempts: {
            increment: 1,
          },
          notes: lead.notes
            ? `${lead.notes}\n\n[${new Date().toISOString()}] New ${data.notificationType}: ${data.messagePreview || "No preview"}`
            : `[${new Date().toISOString()}] New ${data.notificationType}: ${data.messagePreview || "No preview"}`,
        },
      })
      console.log(`✅ Updated existing lead: ${lead.name}`)
    } else {
      // Create new lead
      lead = await prisma.lead.create({
        data: {
          name: data.senderName,
          whatsapp: "Unknown", // Will be updated manually
          source: "INSTAGRAM",
          status: "NEW",
          quality: "WARM", // Default for Instagram leads
          firstContactDate: new Date(),
          lastContactDate: new Date(),
          contactAttempts: 1,
          notes: `[${new Date().toISOString()}] First ${data.notificationType}: ${data.messagePreview || "No preview"}\n\n⚠️ Auto-created from Tasker notification. Please update contact details.`,
        },
      })
      console.log(`✅ Created new lead: ${lead.name}`)
    }

    // Create Instagram message record for tracking
    await prisma.instagramMessage.create({
      data: {
        conversationId: `tasker_${data.senderName.toLowerCase().replace(/\s/g, "_")}`,
        senderId: "unknown",
        senderUsername: data.senderName,
        message: data.messagePreview || `[${data.notificationType}] No preview available`,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        isFromPage: false,
      },
    })

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      leadName: lead.name,
      action: lead ? "updated" : "created",
      message: `Lead ${lead ? "updated" : "created"} successfully`,
    })
  } catch (error) {
    console.error("❌ Error processing Tasker webhook:", error)
    return NextResponse.json(
      { error: "Failed to process notification" },
      { status: 500 }
    )
  }
}
