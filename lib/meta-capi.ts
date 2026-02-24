import { createHash } from "crypto"

// ─── Environment Guard ──────────────────────────────────────────────────────
// All functions return silently if Meta CAPI env vars are not configured.
// This follows the same pattern as lib/email.ts — app works fully without them.

const META_PIXEL_ID = process.env.META_PIXEL_ID
const META_CAPI_ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN
const GRAPH_API_VERSION = "v19.0"

function isConfigured(): boolean {
  return !!(META_PIXEL_ID && META_CAPI_ACCESS_TOKEN)
}

// ─── PII Hashing ────────────────────────────────────────────────────────────
// Meta requires SHA-256 hashing of all PII before sending via CAPI.

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex")
}

function hashEmail(email?: string | null): string | undefined {
  return email ? sha256(email) : undefined
}

function hashPhone(phone?: string | null): string | undefined {
  if (!phone) return undefined
  // Ensure phone starts with country code, strip non-digits
  const cleaned = phone.replace(/\D/g, "")
  return sha256(cleaned)
}

function hashName(name?: string | null): string | undefined {
  return name ? sha256(name) : undefined
}

// ─── Event Sender ───────────────────────────────────────────────────────────

interface MetaEvent {
  event_name: string
  event_time: number
  event_id: string
  event_source_url?: string
  action_source: "website"
  user_data: {
    em?: string // hashed email
    ph?: string // hashed phone
    fn?: string // hashed first name
    ln?: string // hashed last name
    client_ip_address?: string
    client_user_agent?: string
    external_id?: string
    fbc?: string
    fbp?: string
  }
  custom_data?: Record<string, unknown>
}

async function sendMetaEvent(event: MetaEvent): Promise<boolean> {
  if (!isConfigured()) return false

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${META_PIXEL_ID}/events`
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [event],
        access_token: META_CAPI_ACCESS_TOKEN,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Meta CAPI error (${response.status}):`, error)
      return false
    }

    console.log(`📊 Meta CAPI: ${event.event_name} sent (event_id: ${event.event_id})`)
    return true
  } catch (error) {
    console.error("Meta CAPI send failed:", error)
    return false
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

interface TrackLeadParams {
  email?: string | null
  phone?: string | null
  name?: string | null
  sourceUrl?: string
  ip?: string | null
  userAgent?: string | null
  visitorId?: string | null
  fbc?: string | null
  fbp?: string | null
}

/**
 * Track a Lead event server-side via Meta Conversions API.
 * Returns the eventId for client-side deduplication, or null if not configured.
 */
export async function trackServerLead(params: TrackLeadParams): Promise<string | null> {
  if (!isConfigured()) return null

  const eventId = crypto.randomUUID()

  // Split name into first/last for Meta
  const nameParts = params.name?.trim().split(/\s+/) || []
  const firstName = nameParts[0]
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined

  const event: MetaEvent = {
    event_name: "Lead",
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    event_source_url: params.sourceUrl,
    action_source: "website",
    user_data: {
      em: hashEmail(params.email),
      ph: hashPhone(params.phone),
      fn: hashName(firstName),
      ln: hashName(lastName),
      client_ip_address: params.ip || undefined,
      client_user_agent: params.userAgent || undefined,
      external_id: params.visitorId ? sha256(params.visitorId) : undefined,
      fbc: params.fbc || undefined,
      fbp: params.fbp || undefined,
    },
    custom_data: {
      lead_source: "website_contact_form",
    },
  }

  await sendMetaEvent(event)
  return eventId
}

interface TrackPurchaseParams {
  email?: string | null
  phone?: string | null
  name?: string | null
  amount: number
  currency: string
  ip?: string | null
  userAgent?: string | null
  visitorId?: string | null
  orderId?: string
}

/**
 * Track a Purchase event server-side via Meta Conversions API.
 * Returns the eventId for client-side deduplication, or null if not configured.
 */
export async function trackServerPurchase(params: TrackPurchaseParams): Promise<string | null> {
  if (!isConfigured()) return null

  const eventId = crypto.randomUUID()

  const nameParts = params.name?.trim().split(/\s+/) || []
  const firstName = nameParts[0]
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined

  const event: MetaEvent = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    user_data: {
      em: hashEmail(params.email),
      ph: hashPhone(params.phone),
      fn: hashName(firstName),
      ln: hashName(lastName),
      client_ip_address: params.ip || undefined,
      client_user_agent: params.userAgent || undefined,
      external_id: params.visitorId ? sha256(params.visitorId) : undefined,
    },
    custom_data: {
      value: params.amount,
      currency: params.currency,
      order_id: params.orderId,
    },
  }

  await sendMetaEvent(event)
  return eventId
}

interface TrackConversionParams {
  email?: string | null
  phone?: string | null
  conversionType: string
  ip?: string | null
  userAgent?: string | null
}

/**
 * Track a generic conversion event server-side via Meta Conversions API.
 * Returns the eventId for deduplication, or null if not configured.
 */
export async function trackServerConversion(params: TrackConversionParams): Promise<string | null> {
  if (!isConfigured()) return null

  const eventId = crypto.randomUUID()

  const event: MetaEvent = {
    event_name: params.conversionType,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    user_data: {
      em: hashEmail(params.email),
      ph: hashPhone(params.phone),
      client_ip_address: params.ip || undefined,
      client_user_agent: params.userAgent || undefined,
    },
  }

  await sendMetaEvent(event)
  return eventId
}
