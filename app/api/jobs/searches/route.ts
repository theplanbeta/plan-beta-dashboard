import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyPortalToken } from "@/lib/jobs-portal-auth"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(1).max(100),
  filters: z.object({
    germanLevels: z.array(z.string()).default([]),
    locations: z.array(z.string()).default([]),
    jobTypes: z.array(z.string()).default([]),
    englishOk: z.boolean().default(false),
    salaryMin: z.number().nullable().default(null),
    search: z.string().default(""),
  }),
  alertEnabled: z.boolean().default(true),
})

// GET /api/jobs/searches — List saved searches for a premium subscriber
export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const payload = await verifyPortalToken(token)
  if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

  const searches = await prisma.savedSearch.findMany({
    where: { subscriberEmail: payload.email },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ searches })
}

// POST /api/jobs/searches — Create a saved search
export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const payload = await verifyPortalToken(token)
  if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
  }

  // Limit to 10 saved searches per subscriber
  const count = await prisma.savedSearch.count({
    where: { subscriberEmail: payload.email },
  })
  if (count >= 10) {
    return NextResponse.json({ error: "Maximum 10 saved searches" }, { status: 400 })
  }

  const search = await prisma.savedSearch.create({
    data: {
      subscriberEmail: payload.email,
      name: parsed.data.name,
      filters: parsed.data.filters,
      alertEnabled: parsed.data.alertEnabled,
    },
  })

  return NextResponse.json({ search })
}
