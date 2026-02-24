"use client"

import { useState } from "react"
import Script from "next/script"

interface RazorpayCheckoutProps {
  level: string
  amount: number
  currency?: string
  name?: string
  phone?: string
  email?: string
  label?: string
  className?: string
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void
      on: (event: string, handler: () => void) => void
    }
  }
}

export default function RazorpayCheckout({
  level,
  amount,
  currency = "INR",
  name = "",
  phone = "",
  email = "",
  label = "Pay Now",
  className,
}: RazorpayCheckoutProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Only render if Razorpay key is configured
  const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  if (!razorpayKey) return null

  const handlePayment = async () => {
    setLoading(true)
    setError("")

    try {
      // Step 1: Create order on server
      const orderRes = await fetch("/api/payments/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency, level, name, phone, email }),
      })

      if (!orderRes.ok) {
        const data = await orderRes.json()
        throw new Error(data.error || "Failed to create order")
      }

      const { orderId, amount: orderAmount, key } = await orderRes.json()

      // Step 2: Open Razorpay checkout modal
      if (!window.Razorpay) {
        throw new Error("Payment system loading. Please try again.")
      }

      const razorpay = new window.Razorpay({
        key,
        amount: orderAmount,
        currency,
        name: "Plan Beta",
        description: `German ${level} Course`,
        order_id: orderId,
        prefill: {
          name,
          email,
          contact: phone,
        },
        theme: { color: "#d2302c" },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          // Step 3: Verify payment on server
          try {
            const verifyRes = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            })

            if (verifyRes.ok) {
              window.location.href = "/site/contact?payment=success"
            } else {
              setError("Payment verification failed. Please contact support.")
            }
          } catch {
            setError("Payment verification failed. Please contact support.")
          }
        },
      })

      razorpay.on("payment.failed", () => {
        setError("Payment failed. Please try again.")
      })

      razorpay.open()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <button
        onClick={handlePayment}
        disabled={loading}
        className={
          className ||
          "inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
        }
      >
        {loading ? "Processing..." : label}
      </button>
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </>
  )
}
