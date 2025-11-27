import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST /api/test-student - Create test student for content wall
export async function POST() {
  try {
    const testStudent = await prisma.student.upsert({
      where: { studentId: 'teststudent01' },
      update: {},
      create: {
        studentId: 'teststudent01',
        name: 'Test Student',
        whatsapp: '+1234567890',
        email: 'test@student.com',
        currentLevel: 'A1',
        originalPrice: 100,
        finalPrice: 100,
        referralSource: 'INSTAGRAM',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Test student created successfully',
      studentId: testStudent.studentId,
      name: testStudent.name,
    })
  } catch (error: any) {
    console.error("Error creating test student:", error)
    return NextResponse.json(
      { error: "Failed to create test student", details: error.message },
      { status: 500 }
    )
  }
}

// GET /api/test-student - Get sample student IDs
export async function GET() {
  try {
    const students = await prisma.student.findMany({
      select: {
        studentId: true,
        name: true,
        currentLevel: true,
      },
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      count: students.length,
      students,
      message: 'Use any of these student IDs to create posts',
    })
  } catch (error: any) {
    console.error("Error fetching students:", error)
    return NextResponse.json(
      { error: "Failed to fetch students", details: error.message },
      { status: 500 }
    )
  }
}
