import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateStudentId } from "@/lib/utils"
import { sendEmail } from "@/lib/email"
import { checkPermission } from "@/lib/api-permissions"

// GET /api/students - List all students
export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("students", "read")
    if (!check.authorized) return check.response

    const { user } = check.session

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const level = searchParams.get("level")
    const status = searchParams.get("status")
    const batchId = searchParams.get("batchId")

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { whatsapp: { contains: search } },
        { studentId: { contains: search } },
      ]
    }

    if (level) {
      where.currentLevel = level
    }

    if (status) {
      where.completionStatus = status
    }

    if (batchId) {
      where.batchId = batchId
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

    // Generate student ID
    const studentId = generateStudentId()

    // Calculate final price
    const finalPrice = body.originalPrice - (body.discountApplied || 0)
    const balance = finalPrice - (body.totalPaid || 0)

    // If converting from lead, update the lead record
    const leadId = body.leadId

    const student = await prisma.student.create({
      data: {
        studentId,
        name: body.name,
        whatsapp: body.whatsapp,
        email: body.email || null,
        batchId: body.batchId || null,
        enrollmentDate: body.enrollmentDate ? new Date(body.enrollmentDate) : new Date(),
        currentLevel: body.currentLevel || "NEW",
        enrollmentType: body.enrollmentType,
        originalPrice: body.originalPrice,
        discountApplied: body.discountApplied || 0,
        finalPrice,
        currency: body.currency || "EUR",
        paymentStatus: body.paymentStatus || "PENDING",
        totalPaid: body.totalPaid || 0,
        balance,
        referralSource: body.referralSource,
        referredById: body.referredById || null,
        trialAttended: body.trialAttended || false,
        trialDate: body.trialDate ? new Date(body.trialDate) : null,
        notes: body.notes || null,
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
