import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"

// GET /api/students/search?whatsapp=XXX - Find existing student by WhatsApp number
export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("students", "read")
    if (!check.authorized) return check.response

    const { searchParams } = new URL(request.url)
    const whatsapp = searchParams.get("whatsapp")

    if (!whatsapp || whatsapp.trim().length < 4) {
      return NextResponse.json(
        { error: "WhatsApp number is required (min 4 characters)" },
        { status: 400 }
      )
    }

    const student = await prisma.student.findFirst({
      where: {
        whatsapp: { contains: whatsapp.trim(), mode: "insensitive" },
      },
      select: {
        id: true,
        studentId: true,
        name: true,
        whatsapp: true,
        email: true,
        currentLevel: true,
        completionStatus: true,
        batch: {
          select: {
            id: true,
            batchCode: true,
            level: true,
            status: true,
          },
        },
        enrollments: {
          include: {
            batch: {
              select: {
                id: true,
                batchCode: true,
                level: true,
                status: true,
              },
            },
          },
          orderBy: { enrollmentDate: "desc" },
        },
      },
    })

    if (!student) {
      return NextResponse.json({ found: false })
    }

    return NextResponse.json({ found: true, student })
  } catch (error) {
    console.error("Error searching students:", error)
    return NextResponse.json(
      { error: "Failed to search students" },
      { status: 500 }
    )
  }
}
