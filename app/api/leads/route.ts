import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"

// GET /api/leads - List all leads
export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("leads", "read")
    if (!check.authorized) return check.response

    const { user } = check.session

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status")
    const quality = searchParams.get("quality")
    const source = searchParams.get("source")
    const converted = searchParams.get("converted")

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { whatsapp: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (quality) {
      where.quality = quality
    }

    if (source) {
      where.source = source
    }

    if (converted !== null && converted !== undefined) {
      where.converted = converted === "true"
    }

    const leads = await prisma.lead.findMany({
      where,
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
            id: true,
            studentId: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(leads)
  } catch (error) {
    console.error("Failed to fetch leads:", error)
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    )
  }
}

// POST /api/leads - Create a new lead
export async function POST(request: NextRequest) {
  try {
    const check = await checkPermission("leads", "create")
    if (!check.authorized) return check.response

    const { user } = check.session

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
    } = body

    // Validate required fields
    if (!name || !whatsapp || !source) {
      return NextResponse.json(
        { error: "Missing required fields: name, whatsapp, source" },
        { status: 400 }
      )
    }

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        name,
        whatsapp,
        email,
        phone,
        source,
        status: status || "NEW",
        quality: quality || "WARM",
        interestedLevel,
        interestedType,
        batchId,
        notes,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        assignedToId: user.id, // Auto-assign to current user
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

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    console.error("Failed to create lead:", error)
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    )
  }
}
