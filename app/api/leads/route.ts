import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"
import { z } from "zod"

// Validation schema for creating a lead
const createLeadSchema = z.object({
  name: z.string().min(2, "Name too short").max(100, "Name too long"),
  whatsapp: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid WhatsApp format"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  source: z.enum(["META_ADS", "INSTAGRAM", "GOOGLE", "ORGANIC", "REFERRAL", "OTHER"]),
  status: z.enum(["NEW", "CONTACTED", "TRIAL_SCHEDULED", "TRIAL_ATTENDED", "CONVERTED", "LOST"]).optional(),
  quality: z.enum(["HOT", "WARM", "COLD"]).optional(),
  interestedLevel: z.enum(["A1", "A2", "B1", "B2", "SPOKEN_GERMAN"]).optional().or(z.literal("")),
  interestedType: z.enum(["A1_ONLY", "A1_HYBRID", "A2_ONLY", "B1_ONLY", "B2_ONLY", "SPOKEN_GERMAN", "FOUNDATION_A1_A2", "CAREER_A1_A2_B1", "COMPLETE_PATHWAY"]).optional().or(z.literal("")),
  interestedMonth: z.string().optional(),
  interestedBatchTime: z.string().optional(),
  batchId: z.string().optional(),
  notes: z.string().max(2000, "Notes too long").optional(),
  followUpDate: z.string().optional(),
})

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

    // Validate request body
    const validation = createLeadSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        whatsapp: data.whatsapp,
        email: data.email || null,
        phone: data.phone || null,
        source: data.source,
        status: data.status || "NEW",
        quality: data.quality || "WARM",
        interestedLevel: data.interestedLevel || null,
        interestedType: data.interestedType || null,
        interestedMonth: data.interestedMonth || null,
        interestedBatchTime: data.interestedBatchTime || null,
        batchId: data.batchId || null,
        notes: data.notes || null,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
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
