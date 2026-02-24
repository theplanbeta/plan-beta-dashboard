import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifySignature } from "@/lib/razorpay"
import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications"
import { trackServerPurchase } from "@/lib/meta-capi"
import { sendTemplate, WHATSAPP_TEMPLATES } from "@/lib/whatsapp"
import { z } from "zod"

const verifySchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
})

// POST /api/payments/razorpay/verify — Verify payment after checkout
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = verifySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed" },
        { status: 400 }
      )
    }

    const { orderId, paymentId, signature } = validation.data

    // Verify signature
    const isValid = verifySignature({ orderId, paymentId, signature })
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      )
    }

    // Find and update order
    const order = await prisma.razorpayOrder.findUnique({
      where: { razorpayOrderId: orderId },
    })

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      )
    }

    if (order.status === "PAID") {
      return NextResponse.json({ success: true, message: "Already verified" })
    }

    // Update order status
    await prisma.razorpayOrder.update({
      where: { razorpayOrderId: orderId },
      data: {
        status: "PAID",
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      },
    })

    // Create dashboard notification
    createNotification({
      type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
      title: `Payment received: ${order.customerName}`,
      message: `${order.currency} ${Number(order.amount).toLocaleString()} via Razorpay${order.level ? ` for ${order.level}` : ""}`,
      metadata: {
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        amount: Number(order.amount),
        currency: order.currency,
        studentId: order.studentId,
      },
    })

    // Fire Meta CAPI Purchase event
    trackServerPurchase({
      email: order.customerEmail,
      phone: order.customerPhone,
      name: order.customerName,
      amount: Number(order.amount),
      currency: order.currency,
      ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
      orderId,
    })

    // Send WhatsApp payment confirmation
    if (order.customerPhone) {
      sendTemplate(
        order.customerPhone,
        WHATSAPP_TEMPLATES.PAYMENT_REMINDER, // Reuse payment template for confirmation
        [order.customerName, `${order.currency} ${Number(order.amount).toLocaleString()}`],
        { studentId: order.studentId || undefined, leadId: order.leadId || undefined }
      )
    }

    return NextResponse.json({ success: true, paymentId })
  } catch (error) {
    console.error("Razorpay verify error:", error)
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    )
  }
}
