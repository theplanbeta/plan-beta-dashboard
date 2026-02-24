import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyWebhookSignature } from "@/lib/razorpay"
import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications"

// POST /api/payments/razorpay/webhook — Handle Razorpay webhook events
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-razorpay-signature")

    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const body = JSON.parse(rawBody)
    const event = body.event

    if (event === "payment.captured") {
      const payment = body.payload?.payment?.entity
      if (!payment) return NextResponse.json({ status: "ok" })

      const orderId = payment.order_id
      if (!orderId) return NextResponse.json({ status: "ok" })

      // Atomic idempotent update: only updates if status is still CREATED
      const updated = await prisma.razorpayOrder.updateMany({
        where: { razorpayOrderId: orderId, status: "CREATED" },
        data: {
          status: "PAID",
          razorpayPaymentId: payment.id,
        },
      })

      // If 0 rows updated, already processed — skip
      if (updated.count === 0) {
        return NextResponse.json({ status: "ok" })
      }

      // Fetch order details for notification
      const order = await prisma.razorpayOrder.findUnique({
        where: { razorpayOrderId: orderId },
      })

      if (order) {
        createNotification({
          type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
          title: `Payment captured: ${order.customerName}`,
          message: `${order.currency} ${Number(order.amount).toLocaleString()} via Razorpay webhook`,
          metadata: {
            razorpayOrderId: orderId,
            razorpayPaymentId: payment.id,
            amount: Number(order.amount),
            currency: order.currency,
          },
        })
      }
    } else if (event === "payment.failed") {
      const payment = body.payload?.payment?.entity
      const orderId = payment?.order_id
      if (orderId) {
        await prisma.razorpayOrder.updateMany({
          where: { razorpayOrderId: orderId, status: "CREATED" },
          data: { status: "FAILED" },
        })
      }
    }

    return NextResponse.json({ status: "ok" })
  } catch (error) {
    console.error("Razorpay webhook error:", error)
    return NextResponse.json({ status: "ok" })
  }
}
