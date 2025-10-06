import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"
import { generateStudentId } from "@/lib/utils"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

// POST /api/leads/[id]/convert - Convert a lead to a student
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const check = await checkPermission("leads", "update")
    if (!check.authorized) return check.response

    const { id } = await context.params
    const body = await request.json()

    const {
      batchId,
      enrollmentType,
      originalPrice,
      discountApplied,
      trialAttended,
    } = body

    // Validate required fields
    if (!batchId || !enrollmentType || !originalPrice) {
      return NextResponse.json(
        { error: "Missing required fields: batchId, enrollmentType, originalPrice" },
        { status: 400 }
      )
    }

    // Get the lead
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        interestedBatch: true,
      },
    })

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Check if lead is already converted
    if (lead.converted) {
      return NextResponse.json(
        { error: "Lead is already converted" },
        { status: 400 }
      )
    }

    // Get the batch
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
    })

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    }

    // Check if batch has space
    if (batch.enrolledCount >= batch.totalSeats) {
      return NextResponse.json(
        { error: "Batch is full" },
        { status: 400 }
      )
    }

    // Generate student ID
    const studentId = await generateStudentId()

    // Calculate final price
    const finalPrice = originalPrice - (discountApplied || 0)

    // Create student and update lead in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create student
      const student = await tx.student.create({
        data: {
          studentId,
          name: lead.name,
          whatsapp: lead.whatsapp,
          email: lead.email,
          enrollmentDate: new Date(),
          currentLevel: batch.level,
          enrollmentType,
          batchId,
          originalPrice,
          discountApplied: discountApplied || 0,
          finalPrice,
          totalPaid: 0,
          balance: finalPrice,
          paymentStatus: "PENDING",
          referralSource: lead.source,
          trialAttended: trialAttended !== undefined ? trialAttended : lead.trialAttendedDate !== null,
          trialDate: lead.trialAttendedDate,
        },
      })

      // Update lead as converted
      const updatedLead = await tx.lead.update({
        where: { id },
        data: {
          converted: true,
          convertedDate: new Date(),
          studentId: student.id,
          status: "CONVERTED",
        },
      })

      // Update batch enrollment count
      await tx.batch.update({
        where: { id: batchId },
        data: {
          enrolledCount: { increment: 1 },
        },
      })

      return { student, lead: updatedLead }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("Failed to convert lead:", error)
    return NextResponse.json(
      { error: "Failed to convert lead to student" },
      { status: 500 }
    )
  }
}
