import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { createPaymentLink } from "@/lib/razorpay"
import { z } from "zod"

const linkSchema = z.object({
  amount: z.number().positive().max(500000),
  currency: z.enum(["INR", "EUR"]).default("INR"),
  description: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  level: z.string().optional(),
})

// POST /api/payments/razorpay/link — Generate a shareable payment link (authenticated)
export async function POST(request: NextRequest) {
  try {
    const check = await checkPermission("payments", "create")
    if (!check.authorized) return check.response

    const body = await request.json()
    const validation = linkSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    const link = await createPaymentLink({
      amount: Math.round(data.amount * 100), // Convert to paise
      currency: data.currency,
      description: data.description,
      name: data.name,
      phone: data.phone,
      email: data.email,
      notes: {
        level: data.level || "",
        source: "dashboard",
      },
    })

    if (!link) {
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 503 }
      )
    }

    return NextResponse.json({ url: link.short_url, id: link.id })
  } catch (error) {
    console.error("Razorpay link API error:", error)
    return NextResponse.json(
      { error: "Failed to create payment link" },
      { status: 500 }
    )
  }
}
