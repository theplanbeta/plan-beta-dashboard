import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"
import { Prisma } from "@prisma/client"
import { EXCHANGE_RATE } from "@/lib/pricing"

const Decimal = Prisma.Decimal

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/expenses/[id] - Get single expense
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const check = await checkPermission("expenses", "read")
    if (!check.authorized) return check.response

    const { id } = await context.params

    const expense = await prisma.expense.findUnique({ where: { id } })

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 })
    }

    return NextResponse.json(expense)
  } catch (error) {
    console.error("Error fetching expense:", error)
    return NextResponse.json(
      { error: "Failed to fetch expense" },
      { status: 500 }
    )
  }
}

// PUT /api/expenses/[id] - Update expense
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const check = await checkPermission("expenses", "update")
    if (!check.authorized) return check.response

    const { id } = await context.params
    const body = await request.json()

    const existing = await prisma.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.category !== undefined) updateData.category = body.category
    if (body.type !== undefined) updateData.type = body.type
    if (body.date !== undefined) updateData.date = new Date(body.date)
    if (body.notes !== undefined) updateData.notes = body.notes || null
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    // Recompute EUR equivalent if amount or currency changes
    const newAmount = body.amount !== undefined ? body.amount : Number(existing.amount)
    const newCurrency = body.currency !== undefined ? body.currency : existing.currency

    if (body.amount !== undefined || body.currency !== undefined) {
      updateData.amount = new Decimal(newAmount.toString())
      updateData.currency = newCurrency
      updateData.eurEquivalent = newCurrency === "INR"
        ? new Decimal((newAmount / EXCHANGE_RATE).toFixed(2))
        : new Decimal(newAmount.toString())
      updateData.exchangeRateUsed = newCurrency === "INR"
        ? new Decimal(EXCHANGE_RATE)
        : null
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error("Error updating expense:", error)
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    )
  }
}

// DELETE /api/expenses/[id] - Delete expense
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const check = await checkPermission("expenses", "delete")
    if (!check.authorized) return check.response

    const { id } = await context.params

    const existing = await prisma.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 })
    }

    await prisma.expense.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting expense:", error)
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 }
    )
  }
}
