import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createOrder } from "@/lib/razorpay"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { z } from "zod"

const limiter = rateLimit(RATE_LIMITS.STRICT)

const orderSchema = z.object({
  amount: z.number().positive().max(500000), // max Rs.5,00,000
  currency: z.enum(["INR", "EUR"]).default("INR"),
  level: z.string().optional(),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().min(1),
  studentId: z.string().optional(),
  leadId: z.string().optional(),
})

// POST /api/payments/razorpay — Create a Razorpay order (public, rate-limited)
export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await limiter(request)
    if (rateLimitResult) return rateLimitResult

    const body = await request.json()
    const validation = orderSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    // Convert to smallest unit (paise for INR, cents for EUR)
    const amountInSmallestUnit = Math.round(data.amount * 100)

    const order = await createOrder({
      amount: amountInSmallestUnit,
      currency: data.currency,
      receipt: `pb_${Date.now()}`,
      notes: {
        name: data.name,
        phone: data.phone,
        level: data.level || "",
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: "Payment system not configured or failed to create order" },
        { status: 503 }
      )
    }

    // Store order in database
    await prisma.razorpayOrder.create({
      data: {
        razorpayOrderId: order.id,
        amount: data.amount,
        currency: data.currency,
        level: data.level,
        customerName: data.name,
        customerEmail: data.email,
        customerPhone: data.phone,
        studentId: data.studentId,
        leadId: data.leadId,
      },
    })

    return NextResponse.json({
      orderId: order.id,
      amount: amountInSmallestUnit,
      currency: data.currency,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    })
  } catch (error) {
    console.error("Razorpay order API error:", error)
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    )
  }
}
