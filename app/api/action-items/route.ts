import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  source: z.string().default("CFO Agent"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().datetime().optional().nullable(),
})

// GET /api/action-items
export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("actionItems", "read")
    if (!check.authorized) return check.response

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const priority = searchParams.get("priority")

    const where: Record<string, unknown> = {}
    if (status && status !== "all") where.status = status
    if (priority && priority !== "all") where.priority = priority

    const items = await prisma.actionItem.findMany({
      where,
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      include: { createdBy: { select: { name: true } } },
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
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        createdById: check.session!.user.id,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error("Error creating action item:", error)
    return NextResponse.json({ error: "Failed to create action item" }, { status: 500 })
  }
}
