import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const CATEGORIES = ["General", "Marketing", "Operations", "Finance", "Content", "Growth", "Technical"]

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  source: z.string().default("Manual"),
  category: z.string().default("General"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
})

// GET /api/action-items
export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("actionItems", "read")
    if (!check.authorized) return check.response

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const category = searchParams.get("category")

    const where: Record<string, unknown> = {}
    if (status && status !== "all") where.status = status
    if (category && category !== "all") where.category = category

    const items = await prisma.actionItem.findMany({
      where,
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      include: {
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error("Error fetching action items:", error)
    return NextResponse.json({ error: "Failed to fetch action items" }, { status: 500 })
  }
}

// POST /api/action-items
export async function POST(request: NextRequest) {
  try {
    const check = await checkPermission("actionItems", "create")
    if (!check.authorized) return check.response

    const body = await request.json()
    const validation = createSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data
    const item = await prisma.actionItem.create({
      data: {
        title: data.title,
        description: data.description || null,
        source: data.source,
        category: CATEGORIES.includes(data.category) ? data.category : "General",
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        createdById: check.session!.user.id,
        assignedToId: data.assignedToId || null,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error("Error creating action item:", error)
    return NextResponse.json({ error: "Failed to create action item" }, { status: 500 })
  }
}
