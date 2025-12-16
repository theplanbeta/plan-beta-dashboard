import { NextRequest, NextResponse } from 'next/server'
import { checkPermission } from '@/lib/api-permissions'
import { prisma } from '@/lib/prisma'
import { createConnectionSchema } from '@/lib/outreach-validation'
import { z } from 'zod'

// POST /api/outreach/connections/create - Create connection between two students
export async function POST(request: NextRequest) {
  try {
    const check = await checkPermission('outreach', 'create')
    if (!check.authorized) return check.response

    const body = await request.json()

    // Validate input
    let validatedData: z.infer<typeof createConnectionSchema>
    try {
      validatedData = createConnectionSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid input', details: error.issues },
          { status: 400 }
        )
      }
      throw error
    }

    // Validate students exist and are not the same
    if (validatedData.studentId === validatedData.connectedStudentId) {
      return NextResponse.json(
        { error: 'Cannot connect a student to themselves' },
        { status: 400 }
      )
    }

    const [student1, student2] = await Promise.all([
      prisma.student.findUnique({
        where: { id: validatedData.studentId },
        select: {
          id: true,
          name: true,
          email: true,
          whatsapp: true,
          currentLevel: true,
        },
      }),
      prisma.student.findUnique({
        where: { id: validatedData.connectedStudentId },
        select: {
          id: true,
          name: true,
          email: true,
          whatsapp: true,
          currentLevel: true,
        },
      }),
    ])

    if (!student1) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    if (!student2) {
      return NextResponse.json(
        { error: 'Connected student not found' },
        { status: 404 }
      )
    }

    // Check if connection already exists
    const existingConnection = await prisma.studentConnection.findUnique({
      where: {
        studentId_connectedStudentId: {
          studentId: validatedData.studentId,
          connectedStudentId: validatedData.connectedStudentId,
        },
      },
    })

    if (existingConnection) {
      return NextResponse.json(
        { error: 'Connection already exists' },
        { status: 400 }
      )
    }

    const userId = check.session.user.id
    const userName = 'Founder' // In production, fetch from user table

    // Create the connection (bidirectional)
    const result = await prisma.$transaction(async (tx) => {
      // Create connection from student1 to student2
      const connection1 = await tx.studentConnection.create({
        data: {
          studentId: validatedData.studentId,
          connectedStudentId: validatedData.connectedStudentId,
          reason: validatedData.reason,
          introducedBy: userId,
          introducedByName: userName,
          status: 'INTRODUCED',
          notes: validatedData.notes,
        },
      })

      // Create reverse connection (student2 to student1)
      const connection2 = await tx.studentConnection.create({
        data: {
          studentId: validatedData.connectedStudentId,
          connectedStudentId: validatedData.studentId,
          reason: validatedData.reason,
          introducedBy: userId,
          introducedByName: userName,
          status: 'INTRODUCED',
          notes: validatedData.notes,
        },
      })

      // Send introduction if requested
      if (validatedData.sendIntroduction) {
        // In production, this would trigger email/WhatsApp introduction
        // For now, just log it
        console.log(
          `📧 Introduction email would be sent to ${student1.email} and ${student2.email}`
        )
        console.log(`📱 WhatsApp message would be sent to:`)
        console.log(
          `   - ${student1.name}: ${student1.whatsapp}`
        )
        console.log(
          `   - ${student2.name}: ${student2.whatsapp}`
        )
        console.log(`   Reason: ${validatedData.reason}`)

        // You can integrate with your email/WhatsApp service here
        // await sendIntroductionEmail(student1, student2, validatedData.reason)
        // await sendWhatsAppIntroduction(student1, student2, validatedData.reason)
      }

      return {
        connection1,
        connection2,
        student1,
        student2,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Connection created successfully',
      data: {
        connection: result.connection1,
        students: {
          student1: result.student1,
          student2: result.student2,
        },
        introductionSent: validatedData.sendIntroduction,
      },
    })
  } catch (error) {
    console.error('Failed to create connection:', error)
    return NextResponse.json(
      { error: 'Failed to create connection' },
      { status: 500 }
    )
  }
}

// Helper function to send introduction email (placeholder)
// async function sendIntroductionEmail(
//   student1: any,
//   student2: any,
//   reason: string
// ) {
//   // Implement email sending logic
//   // This would use your email service (SendGrid, Resend, etc.)
// }

// Helper function to send WhatsApp introduction (placeholder)
// async function sendWhatsAppIntroduction(
//   student1: any,
//   student2: any,
//   reason: string
// ) {
//   // Implement WhatsApp sending logic
//   // This would use your WhatsApp Business API
// }
