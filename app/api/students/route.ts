import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateStudentId } from "@/lib/utils"
import { sendEmail } from "@/lib/email"
import { checkPermission } from "@/lib/api-permissions"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { getEurEquivalent, EXCHANGE_RATE } from "@/lib/pricing"
import { trackEnrollmentFromContent } from "@/lib/attribution-tracking"

const Decimal = Prisma.Decimal

// Validation schema for creating a student
const createStudentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  whatsapp: z.string().min(1, "WhatsApp number is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  batchId: z.string().optional(),
  enrollmentDate: z.string().optional(),
  currentLevel: z.enum(["NEW", "A1", "A1_HYBRID", "A1_HYBRID_MALAYALAM", "A2", "B1", "B2", "SPOKEN_GERMAN"]).optional(),
  isCombo: z.boolean().optional(),
  comboLevels: z.array(z.enum(["NEW", "A1", "A1_HYBRID", "A1_HYBRID_MALAYALAM", "A2", "B1", "B2", "SPOKEN_GERMAN"])).optional(),
  originalPrice: z.number().min(0, "Original price cannot be negative").max(1000000, "Price exceeds maximum"),
  discountApplied: z.number().min(0, "Discount cannot be negative").optional(),
  currency: z.enum(["INR", "EUR"]).optional(),
  paymentStatus: z.enum(["PENDING", "PARTIAL", "PAID", "OVERDUE"]).optional(),
  totalPaid: z.number().min(0, "Total paid cannot be negative").optional(),
  referralSource: z.enum(["META_ADS", "INSTAGRAM", "GOOGLE", "ORGANIC", "REFERRAL", "OTHER"]).optional(),
  referredById: z.string().optional(),
  trialAttended: z.boolean().optional(),
  trialDate: z.string().optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
  leadId: z.string().optional(),
})

// GET /api/students - List all students
export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("students", "read")
    if (!check.authorized) return check.response

    const { user } = check.session

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const level = searchParams.get("level")
    const paymentStatus = searchParams.get("paymentStatus")
    const batchId = searchParams.get("batchId")
    const churnRisk = searchParams.get("churnRisk")

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
        { email: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
        { whatsapp: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
        { studentId: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
      ]
    }

    if (level) {
      where.currentLevel = level
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus
    }

    if (batchId) {
      where.batchId = batchId
    }

    if (churnRisk) {
      where.churnRisk = churnRisk
    }

    // For TEACHER role, filter students to only show those in batches assigned to the teacher
    if (user.role === "TEACHER") {
      where.batch = { teacherId: user.id }
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        batch: {
          select: {
            id: true,
            batchCode: true,
            level: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(students)
  } catch (error) {
    console.error("Error fetching students:", error)
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    )
  }
}

// POST /api/students - Create a new student
export async function POST(request: NextRequest) {
  try {
    const check = await checkPermission("students", "create")
    if (!check.authorized) return check.response

    const body = await request.json()

    // Validate request body
    const validation = createStudentSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    // Generate student ID
    const studentId = generateStudentId()

    // Calculate final price and balance using Decimal for precision
    const originalPrice = new Decimal(data.originalPrice.toString())
    const discountApplied = new Decimal((data.discountApplied || 0).toString())
    const totalPaid = new Decimal((data.totalPaid || 0).toString())

    const finalPrice = originalPrice.minus(discountApplied)
    const balance = finalPrice.minus(totalPaid)

    // Calculate EUR equivalents for aggregation
    const currency = data.currency || "EUR"
    const eurEquivalent = new Decimal(
      getEurEquivalent(Number(finalPrice), currency as "EUR" | "INR").toFixed(2)
    )
    const totalPaidEur = new Decimal(
      getEurEquivalent(Number(totalPaid), currency as "EUR" | "INR").toFixed(2)
    )
    const exchangeRateUsed = currency === "INR" ? new Decimal(EXCHANGE_RATE) : null

    // If converting from lead, update the lead record
    const leadId = data.leadId

    const student = await prisma.student.create({
      data: {
        studentId,
        name: data.name,
        whatsapp: data.whatsapp,
        email: data.email || null,
        batchId: data.batchId || null,
        enrollmentDate: data.enrollmentDate ? new Date(data.enrollmentDate) : new Date(),
        currentLevel: data.currentLevel || "NEW",
        isCombo: data.isCombo || false,
        comboLevels: data.comboLevels || [],
        originalPrice,
        discountApplied,
        finalPrice,
        currency,
        eurEquivalent,
        exchangeRateUsed,
        paymentStatus: data.paymentStatus || "PENDING",
        totalPaid,
        totalPaidEur,
        balance,
        referralSource: data.referralSource || "OTHER",
        referredById: data.referredById || null,
        trialAttended: data.trialAttended || false,
        trialDate: data.trialDate ? new Date(data.trialDate) : null,
        notes: data.notes || null,
      },
      include: {
        batch: {
          select: {
            id: true,
            batchCode: true,
            level: true,
          },
        },
      },
    })

    // Create initial payment record if totalPaid > 0
    if (totalPaid.greaterThan(0)) {
      await prisma.payment.create({
        data: {
          studentId: student.id,
          amount: totalPaid,
          currency,
          paymentDate: student.enrollmentDate,
          method: "OTHER", // Default method for initial payments during enrollment
          status: "COMPLETED",
          notes: "Initial payment recorded during student enrollment",
        },
      })
    }

    // Mark lead as converted if this was a lead conversion
    if (leadId) {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          converted: true,
          convertedDate: new Date(),
          studentId: student.id,
          status: "CONVERTED",
        },
      })

      // Track attribution: update content performance if lead came from a reel
      await trackEnrollmentFromContent(leadId, Number(finalPrice))
    }

    // Send welcome email if preferences allow
    if (student.email && student.emailNotifications && student.emailWelcome) {
      await sendEmail("student-welcome", {
        to: student.email,
        studentName: student.name,
        studentId: student.studentId,
        level: student.currentLevel,
        batchCode: student.batch?.batchCode || null,
        startDate: student.enrollmentDate.toLocaleDateString(),
      })
    }

    return NextResponse.json(student, { status: 201 })
  } catch (error) {
    console.error("Error creating student:", error)
    return NextResponse.json(
      { error: "Failed to create student" },
      { status: 500 }
    )
  }
}
