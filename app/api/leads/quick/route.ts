import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const quickLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  whatsapp: z.string().min(10, "Valid WhatsApp number is required"),
  interestedLevel: z.enum(["A1", "A2", "B1", "B2", "SPOKEN_GERMAN"]),
  interestedMonth: z.string().min(1, "Month is required"),
  interestedBatchTime: z.enum(["Morning", "Evening"]),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = quickLeadSchema.parse(body)

    // Create lead with minimal required fields
    const lead = await prisma.lead.create({
      data: {
        name: validatedData.name,
        whatsapp: validatedData.whatsapp,
        interestedLevel: validatedData.interestedLevel,
        interestedMonth: validatedData.interestedMonth,
        interestedBatchTime: validatedData.interestedBatchTime,
        source: "ORGANIC", // Default source for quick entry
        status: "NEW", // Default status
        quality: "WARM", // Default quality
        assignedToId: session.user.id, // Assign to current user
      },
    })

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating quick lead:", error)
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    )
  }
}
