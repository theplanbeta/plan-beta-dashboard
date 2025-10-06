import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

// GET /api/leads/[id] - Get a single lead
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const check = await checkPermission("leads", "read")
    if (!check.authorized) return check.response

    const { id } = await context.params

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        interestedBatch: {
          select: {
            batchCode: true,
            level: true,
            enrolledCount: true,
            totalSeats: true,
          },
        },
        assignedTo: {
          select: {
            name: true,
            email: true,
          },
        },
        convertedToStudent: {
          select: {
            studentId: true,
            name: true,
            email: true,
            whatsapp: true,
          },
        },
      },
    })

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    return NextResponse.json(lead)
  } catch (error) {
    console.error("Failed to fetch lead:", error)
    return NextResponse.json(
      { error: "Failed to fetch lead" },
      { status: 500 }
    )
  }
}

// PUT /api/leads/[id] - Update a lead
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const check = await checkPermission("leads", "update")
    if (!check.authorized) return check.response

    const { id } = await context.params
    const body = await request.json()

    const {
      name,
      whatsapp,
      email,
      phone,
      source,
      status,
      quality,
      interestedLevel,
      interestedType,
      batchId,
      notes,
      followUpDate,
      followUpNotes,
      contactAttempts,
      trialScheduledDate,
      trialAttendedDate,
      lastContactDate,
    } = body

    // Check if lead exists
    const existingLead = await prisma.lead.findUnique({
      where: { id },
    })

    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Don't allow updating converted leads
    if (existingLead.converted) {
      return NextResponse.json(
        { error: "Cannot update a converted lead" },
        { status: 400 }
      )
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        name,
        whatsapp,
        email,
        phone,
        source,
        status,
        quality,
        interestedLevel,
        interestedType,
        batchId,
        notes,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        followUpNotes,
        contactAttempts,
        trialScheduledDate: trialScheduledDate ? new Date(trialScheduledDate) : null,
        trialAttendedDate: trialAttendedDate ? new Date(trialAttendedDate) : null,
        lastContactDate: lastContactDate ? new Date(lastContactDate) : null,
      },
      include: {
        interestedBatch: {
          select: {
            batchCode: true,
            level: true,
          },
        },
        assignedTo: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(lead)
  } catch (error) {
    console.error("Failed to update lead:", error)
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 }
    )
  }
}

// DELETE /api/leads/[id] - Delete a lead
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const check = await checkPermission("leads", "delete")
    if (!check.authorized) return check.response

    const { id } = await context.params

    // Check if lead exists
    const existingLead = await prisma.lead.findUnique({
      where: { id },
    })

    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Don't allow deleting converted leads
    if (existingLead.converted) {
      return NextResponse.json(
        { error: "Cannot delete a converted lead" },
        { status: 400 }
      )
    }

    await prisma.lead.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Lead deleted successfully" })
  } catch (error) {
    console.error("Failed to delete lead:", error)
    return NextResponse.json(
      { error: "Failed to delete lead" },
      { status: 500 }
    )
  }
}
