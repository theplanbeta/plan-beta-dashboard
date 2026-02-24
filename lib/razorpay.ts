import { createHmac } from "crypto"

// ─── Environment Guard ──────────────────────────────────────────────────────
// Returns null from all functions if Razorpay env vars are not configured.

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET

function isConfigured(): boolean {
  return !!(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET)
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface CreateOrderParams {
  amount: number // in smallest unit (paise for INR, cents for EUR)
  currency: string
  receipt: string
  notes?: Record<string, string>
}

interface RazorpayOrder {
  id: string
  amount: number
  currency: string
  receipt: string
  status: string
}

interface CreatePaymentLinkParams {
  amount: number // in smallest unit (paise for INR)
  currency: string
  description: string
  name: string
  phone: string
  email?: string
  callbackUrl?: string
  notes?: Record<string, string>
}

interface PaymentLink {
  id: string
  short_url: string
  amount: number
  currency: string
  status: string
}

// ─── Helper ─────────────────────────────────────────────────────────────────

async function razorpayFetch(path: string, body: Record<string, unknown>): Promise<Response> {
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")
  return fetch(`https://api.razorpay.com/v1${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(body),
  })
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Create a Razorpay order.
 * Amount should be in smallest currency unit (paise for INR, cents for EUR).
 */
export async function createOrder(params: CreateOrderParams): Promise<RazorpayOrder | null> {
  if (!isConfigured()) return null

  try {
    const response = await razorpayFetch("/orders", {
      amount: params.amount,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes || {},
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Razorpay createOrder error (${response.status}):`, error)
      return null
    }

    const order = await response.json()
    console.log(`💳 Razorpay order created: ${order.id} (${params.currency} ${params.amount})`)
    return order
  } catch (error) {
    console.error("Razorpay createOrder failed:", error)
    return null
  }
}

/**
 * Verify Razorpay payment signature using HMAC SHA256.
 * Returns true if the signature is valid.
 */
export function verifySignature(params: {
  orderId: string
  paymentId: string
  signature: string
}): boolean {
  if (!RAZORPAY_KEY_SECRET) return false

  const body = `${params.orderId}|${params.paymentId}`
  const expectedSignature = createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex")

  return expectedSignature === params.signature
}

/**
 * Verify Razorpay webhook signature.
 * Returns true if the webhook payload is authentic.
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!webhookSecret) return false

  const expectedSignature = createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex")

  return expectedSignature === signature
}

/**
 * Create a shareable payment link.
 * Amount should be in smallest currency unit (paise for INR).
 */
export async function createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLink | null> {
  if (!isConfigured()) return null

  try {
    const response = await razorpayFetch("/payment_links", {
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      customer: {
        name: params.name,
        contact: params.phone,
        email: params.email,
      },
      callback_url: params.callbackUrl,
      callback_method: params.callbackUrl ? "get" : undefined,
      notes: params.notes || {},
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Razorpay createPaymentLink error (${response.status}):`, error)
      return null
    }

    const link = await response.json()
    console.log(`💳 Razorpay payment link created: ${link.short_url}`)
    return link
  } catch (error) {
    console.error("Razorpay createPaymentLink failed:", error)
    return null
  }
}

/**
 * Returns the client-side Razorpay key ID, or null if not configured.
 */
export function getPublicKeyId(): string | null {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || null
}
