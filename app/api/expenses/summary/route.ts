import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"
import { EXCHANGE_RATE } from "@/lib/pricing"

// GET /api/expenses/summary - Get expense summary for a period
export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("expenses", "read")
    if (!check.authorized) return check.response

    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")

    // Default to current month
    const now = new Date()
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = endDateParam
      ? new Date(endDateParam)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const periodDays = Math.max(1,
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Fetch one-time expenses in the date range
    const oneTimeExpenses = await prisma.expense.findMany({
      where: {
        type: "ONE_TIME",
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: "desc" },
    })

    // Fetch all active recurring expenses
    const recurringExpenses = await prisma.expense.findMany({
      where: {
        type: "RECURRING",
        isActive: true,
      },
      orderBy: { name: "asc" },
    })

    // Calculate totals in EUR
    const toEur = (amount: number, currency: string) =>
      currency === "INR" ? amount / EXCHANGE_RATE : amount

    const monthlyRecurringTotal = recurringExpenses.reduce(
      (sum, e) => sum + toEur(Number(e.amount), e.currency), 0
    )

    // Prorate recurring to the period
    const proratedRecurring = monthlyRecurringTotal * (periodDays / 30)

    const oneTimeTotal = oneTimeExpenses.reduce(
      (sum, e) => sum + toEur(Number(e.amount), e.currency), 0
    )

    const totalExpenses = proratedRecurring + oneTimeTotal

    // By category breakdown (EUR)
    const byCategory: Record<string, number> = {}

    for (const e of recurringExpenses) {
      const eurAmt = toEur(Number(e.amount), e.currency) * (periodDays / 30)
      byCategory[e.category] = (byCategory[e.category] || 0) + eurAmt
    }

    for (const e of oneTimeExpenses) {
      const eurAmt = toEur(Number(e.amount), e.currency)
      byCategory[e.category] = (byCategory[e.category] || 0) + eurAmt
    }

    return NextResponse.json({
      period: { startDate, endDate, days: periodDays },
      totalExpenses,
      byCategory,
      recurring: {
        monthlyTotal: monthlyRecurringTotal,
        proratedTotal: proratedRecurring,
        count: recurringExpenses.length,
        items: recurringExpenses,
      },
      oneTime: {
        total: oneTimeTotal,
        count: oneTimeExpenses.length,
        items: oneTimeExpenses,
      },
    })
  } catch (error) {
    console.error("Error fetching expense summary:", error)
    return NextResponse.json(
      { error: "Failed to fetch expense summary" },
      { status: 500 }
    )
  }
}
