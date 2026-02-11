import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"
import { z } from "zod"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { Prisma } from "@prisma/client"
import { EXCHANGE_RATE } from "@/lib/pricing"

const limiter = rateLimit(RATE_LIMITS.STANDARD)
const Decimal = Prisma.Decimal

const createExpenseSchema = z.object({
  name: z.string().min(1, "Name required").max(200),
  amount: z.number().positive("Amount must be positive"),
  currency: z.enum(["EUR", "INR"]).default("EUR"),
  category: z.enum(["INFRASTRUCTURE", "TOOLS_SOFTWARE", "MARKETING", "ADMINISTRATIVE", "OTHER"]),
  type: z.enum(["RECURRING", "ONE_TIME"]),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  notes: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
})

// GET /api/expenses - List all expenses
export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("expenses", "read")
    if (!check.authorized) return check.response

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const type = searchParams.get("type")
    const isActive = searchParams.get("isActive")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: Record<string, unknown> = {}

    if (category) where.category = category
    if (type) where.type = type
    if (isActive !== null && isActive !== undefined && isActive !== "") {
      where.isActive = isActive === "true"
    }

    if (startDate || endDate) {
      where.date = {} as Record<string, Date>
      if (startDate) (where.date as Record<string, Date>).gte = new Date(startDate)
      if (endDate) (where.date as Record<string, Date>).lte = new Date(endDate)
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error("Error fetching expenses:", error)
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    )
  }
}

// POST /api/expenses - Create a new expense
export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await limiter(request)
    if (rateLimitResult) return rateLimitResult

    const check = await checkPermission("expenses", "create")
    if (!check.authorized) return check.response

    const body = await request.json()

    const validation = createExpenseSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data
    const amount = new Decimal(data.amount.toString())
    const eurEquivalent = data.currency === "INR"
      ? new Decimal((data.amount / EXCHANGE_RATE).toFixed(2))
      : amount
    const exchangeRateUsed = data.currency === "INR"
      ? new Decimal(EXCHANGE_RATE)
      : null

    const expense = await prisma.expense.create({
      data: {
        name: data.name,
        amount,
        currency: data.currency,
        eurEquivalent,
        exchangeRateUsed,
        category: data.category,
        type: data.type,
        date: new Date(data.date),
        notes: data.notes || null,
        isActive: data.isActive,
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error("Error creating expense:", error)
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    )
  }
}
