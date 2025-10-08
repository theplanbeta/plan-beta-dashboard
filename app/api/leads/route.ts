import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"
import { z } from "zod"

// Validation schema for creating a lead (relaxed validation)
const createLeadSchema = z.object({
  name: z.string().min(1, "Name required"),
  whatsapp: z.string().transform(val => val?.replace(/\+/g, '') || val).pipe(z.string().min(1, "WhatsApp required")), // Remove + symbols
  email: z.string().optional().or(z.literal("")),
  phone: z.string().transform(val => val?.replace(/\+/g, '') || val).optional().or(z.literal("")), // Remove + symbols
  source: z.enum(["META_ADS", "INSTAGRAM", "GOOGLE", "ORGANIC", "REFERRAL", "OTHER"]),
  status: z.enum(["NEW", "CONTACTED", "TRIAL_SCHEDULED", "TRIAL_ATTENDED", "CONVERTED", "LOST"]).optional(),
  quality: z.enum(["HOT", "WARM", "COLD"]).optional(),
  interestedLevel: z.string().optional().or(z.literal("")),
  interestedType: z.string().optional().or(z.literal("")),
  interestedMonth: z.string().optional().or(z.literal("")),
  interestedBatchTime: z.string().optional().or(z.literal("")),
  batchId: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  followUpDate: z.string().optional().or(z.literal("")),
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

    // Debug logging
    console.log("📋 Lead creation attempt:")
    console.log("User ID:", user.id, "| Role:", user.role)
    console.log("Request body:", JSON.stringify(body, null, 2))

    // Validate request body
    const validation = createLeadSchema.safeParse(body)
    if (!validation.success) {
      console.error("❌ Validation failed:")
      console.error("Errors:", JSON.stringify(validation.error.issues, null, 2))
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    console.log("✅ Validation passed")

    const data = validation.data

    // Check if the user exists in the database before assigning
    const userExists = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true }
    })

    // Create lead
    console.log("💾 Creating lead in database...")
    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        whatsapp: data.whatsapp,
        email: data.email || null,
        phone: data.phone || null,
        source: data.source,
        status: data.status || "NEW",
        quality: data.quality || "WARM",
        interestedLevel: (data.interestedLevel || null) as any, // Type cast for relaxed validation
        interestedMonth: data.interestedMonth || null,
        interestedBatchTime: data.interestedBatchTime || null,
        batchId: data.batchId || null,
        notes: data.notes || null,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
        assignedToId: userExists ? user.id : null, // Only assign if user exists
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

    console.log("✅ Lead created successfully:", lead.id)
    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    console.error("❌ Failed to create lead:", error)
    console.error("Error details:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to create lead", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
