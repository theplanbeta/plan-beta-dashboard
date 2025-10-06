import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission } from '@/lib/api-permissions'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { logSuccess } from '@/lib/audit'
import { AuditAction } from '@prisma/client'

// Validation schema for updating teacher profile
const updateTeacherSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  qualifications: z.string().optional(),
  experience: z.string().optional(),
  specializations: z.string().optional(),
  languages: z.string().optional(),
  availability: z.string().optional(),
  hourlyRate: z.number().optional(),
  preferredContact: z.string().optional(),
  whatsapp: z.string().optional(),
  active: z.boolean().optional(), // Only FOUNDER can change this
})

// GET /api/teachers/[id] - Get teacher details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const check = await checkPermission('teachers', 'read')
    if (!check.authorized) return check.response

    const { id } = await params

    const teacher = await prisma.user.findUnique({
      where: { id, role: 'TEACHER' },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        active: true,
        bio: true,
        qualifications: true,
        experience: true,
        specializations: true,
        languages: true,
        availability: true,
        hourlyRate: true,
        preferredContact: true,
        whatsapp: true,
        createdAt: true,
        batches: {
          select: {
            id: true,
            batchCode: true,
            level: true,
            startDate: true,
            endDate: true,
            schedule: true,
            status: true,
            enrolledCount: true,
            totalSeats: true,
          },
          orderBy: {
            startDate: 'desc',
          },
        },
      },
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    return NextResponse.json(teacher)
  } catch (error) {
    console.error('Error fetching teacher:', error)
    return NextResponse.json({ error: 'Failed to fetch teacher' }, { status: 500 })
  }
}

// PATCH /api/teachers/[id] - Update teacher profile
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    // Validate request
    const validation = updateTeacherSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    // Check permissions
    // Teachers can only update their own profile
    // FOUNDER can update any teacher
    const isOwnProfile = session.user.id === id
    const isFounder = session.user.role === 'FOUNDER'

    if (!isOwnProfile && !isFounder) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only FOUNDER can change active status
    if (data.active !== undefined && !isFounder) {
      return NextResponse.json(
        { error: 'Only admins can change active status' },
        { status: 403 }
      )
    }

    // Get current teacher state for audit comparison
    const currentTeacher = await prisma.user.findUnique({
      where: { id },
      select: { active: true, name: true },
    })

    // Update teacher
    const teacher = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.qualifications !== undefined && { qualifications: data.qualifications }),
        ...(data.experience !== undefined && { experience: data.experience }),
        ...(data.specializations !== undefined && { specializations: data.specializations }),
        ...(data.languages !== undefined && { languages: data.languages }),
        ...(data.availability !== undefined && { availability: data.availability }),
        ...(data.hourlyRate !== undefined && { hourlyRate: data.hourlyRate }),
        ...(data.preferredContact !== undefined && { preferredContact: data.preferredContact }),
        ...(data.whatsapp !== undefined && { whatsapp: data.whatsapp }),
        ...(data.active !== undefined && isFounder && { active: data.active }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        active: true,
        bio: true,
        qualifications: true,
        experience: true,
        specializations: true,
        languages: true,
        availability: true,
        hourlyRate: true,
        preferredContact: true,
        whatsapp: true,
        updatedAt: true,
      },
    })

    // Audit logging
    if (data.active !== undefined && currentTeacher && currentTeacher.active !== data.active) {
      // Active status changed
      await logSuccess(
        data.active ? AuditAction.TEACHER_ACTIVATED : AuditAction.TEACHER_DEACTIVATED,
        `Teacher ${data.active ? 'activated' : 'deactivated'}: ${teacher.name}`,
        {
          entityType: 'User',
          entityId: teacher.id,
          metadata: {
            teacherName: teacher.name,
            previousStatus: currentTeacher.active,
            newStatus: data.active,
          },
          request: req,
        }
      )
    } else {
      // Regular update
      await logSuccess(
        AuditAction.TEACHER_UPDATED,
        `Teacher profile updated: ${teacher.name}`,
        {
          entityType: 'User',
          entityId: teacher.id,
          metadata: {
            teacherName: teacher.name,
            updatedBy: isOwnProfile ? 'self' : 'admin',
          },
          request: req,
        }
      )
    }

    return NextResponse.json(teacher)
  } catch (error) {
    console.error('Error updating teacher:', error)
    return NextResponse.json({ error: 'Failed to update teacher' }, { status: 500 })
  }
}

// DELETE /api/teachers/[id] - Deactivate teacher (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const check = await checkPermission('teachers', 'delete')
    if (!check.authorized) return check.response

    const { id } = await params

    // Soft delete by setting active = false
    const teacher = await prisma.user.update({
      where: { id },
      data: { active: false },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
      },
    })

    return NextResponse.json(teacher)
  } catch (error) {
    console.error('Error deactivating teacher:', error)
    return NextResponse.json({ error: 'Failed to deactivate teacher' }, { status: 500 })
  }
}
