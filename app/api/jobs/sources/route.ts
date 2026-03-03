import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"
import { z } from "zod"

// GET /api/jobs/sources — Authenticated, lists job sources
export async function GET() {
  const auth = await checkPermission("jobs", "read")
  if (!auth.authorized) return auth.response

  const sources = await prisma.jobSource.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { jobs: { where: { active: true } } },
      },
    },
  })

  return NextResponse.json(sources)
}

const sourceSchema = z.object({
  name: z.string().min(1, "Name required"),
  url: z.string().url("Valid URL required"),
})

// POST /api/jobs/sources — Authenticated, adds a new source
export async function POST(request: NextRequest) {
  const auth = await checkPermission("jobs", "create")
  if (!auth.authorized) return auth.response

  try {
    const body = await request.json()
    const validation = sourceSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const source = await prisma.jobSource.create({
      data: {
        name: validation.data.name,
        url: validation.data.url,
      },
    })

    return NextResponse.json(source, { status: 201 })
  } catch (error) {
    console.error("[Job Sources] Error:", error)
    const msg = (error as { code?: string }).code === "P2002" ? "A source with this name already exists" : "Failed to create source"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
