import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { checkPermission } from "@/lib/api-permissions"
import { COURSE_PRICING, getEurEquivalent, EXCHANGE_RATE, type CourseLevel } from "@/lib/pricing"
import { syncStudentFinancials } from "@/lib/enrollment-financials"

// POST /api/students/:id/enroll - Enroll existing student in a new batch
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const check = await checkPermission("students", "update")
    if (!check.authorized) return check.response

    const { id } = await params
    const body = await request.json()
    const { batchId, notes, originalPrice: rawOriginalPrice, discountApplied: rawDiscount, currency: rawCurrency } = body

    if (!batchId) {
      return NextResponse.json(
        { error: "Batch ID is required" },
        { status: 400 }
      )
    }

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id },
      select: { id: true, name: true, currency: true },
    })

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      )
    }

    // Verify batch exists and is open for enrollment
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { id: true, batchCode: true, level: true, status: true, totalSeats: true },
    })

    if (!batch) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      )
    }

    if (!["PLANNING", "FILLING", "RUNNING"].includes(batch.status)) {
      return NextResponse.json(
        { error: `Batch ${batch.batchCode} is ${batch.status} and not accepting enrollments` },
        { status: 400 }
      )
    }

    // Check for duplicate enrollment
    const existingEnrollment = await prisma.batchEnrollment.findUnique({
      where: {
        studentId_batchId: { studentId: id, batchId },
      },
    })

    if (existingEnrollment) {
      return NextResponse.json(
        { error: `${student.name} is already enrolled in ${batch.batchCode}` },
        { status: 409 }
      )
    }

    // Determine pricing for the new enrollment
    const Decimal = Prisma.Decimal
    const currency = rawCurrency || student.currency || "EUR"
    const levelKey = batch.level as CourseLevel
    const pricing = COURSE_PRICING[levelKey]

    const originalPrice = new Decimal((rawOriginalPrice ?? pricing?.[currency as "EUR" | "INR"] ?? 0).toString())
    const discountApplied = new Decimal((rawDiscount ?? 0).toString())
    const finalPrice = originalPrice.minus(discountApplied)
    const eurEquivalent = new Decimal(
      getEurEquivalent(Number(finalPrice), currency as "EUR" | "INR").toFixed(2)
    )
    const exchangeRateUsed = currency === "INR" ? new Decimal(EXCHANGE_RATE) : null

    // Create enrollment and update student's primary batch in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const enrollment = await tx.batchEnrollment.create({
        data: {
          studentId: id,
          batchId,
          notes: notes || null,
          originalPrice,
          discountApplied,
          finalPrice,
          currency,
          eurEquivalent,
          exchangeRateUsed,
          balance: finalPrice,
          paymentStatus: "PENDING",
        },
        include: {
          batch: {
            select: { id: true, batchCode: true, level: true },
          },
        },
      })

      // Update student's primary batch and current level
      await tx.student.update({
        where: { id },
        data: {
          batchId,
          currentLevel: batch.level,
        },
      })

      return enrollment
    })

    // Sync student aggregates (new enrollment adds to total balance)
    await syncStudentFinancials(id)

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("Error enrolling student in batch:", error)
    return NextResponse.json(
      { error: "Failed to enroll student in batch" },
      { status: 500 }
    )
  }
}
