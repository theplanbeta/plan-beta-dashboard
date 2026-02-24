"use client"

// ─── Constants ───────────────────────────────────────────────────────────────
const TRACKING_KEY = "pb-tracking"
const VISITOR_KEY = "pb-visitor-id"

// ─── Types ───────────────────────────────────────────────────────────────────
export interface TrackingData {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  referrerUrl?: string
  landingPage?: string
  deviceType?: string
}

// ─── UTM Capture ─────────────────────────────────────────────────────────────
// Call on page load to capture UTM params from URL + referrer + landing page
export function captureTrackingData(): void {
  if (typeof window === "undefined") return

  // Don't overwrite if already captured this session (first touch wins)
  const existing = sessionStorage.getItem(TRACKING_KEY)
  if (existing) return

  const params = new URLSearchParams(window.location.search)
  const data: TrackingData = {}

  const utmSource = params.get("utm_source")
  const utmMedium = params.get("utm_medium")
  const utmCampaign = params.get("utm_campaign")
  const utmContent = params.get("utm_content")
  const utmTerm = params.get("utm_term")

  if (utmSource) data.utmSource = utmSource
  if (utmMedium) data.utmMedium = utmMedium
  if (utmCampaign) data.utmCampaign = utmCampaign
  if (utmContent) data.utmContent = utmContent
  if (utmTerm) data.utmTerm = utmTerm

  // Capture referrer (only external)
  if (document.referrer && !document.referrer.includes(window.location.hostname)) {
    data.referrerUrl = document.referrer
  }

  // Landing page
  data.landingPage = window.location.pathname

  // Device type
  data.deviceType = window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop"

  sessionStorage.setItem(TRACKING_KEY, JSON.stringify(data))
}

// ─── Retrieve Tracking Data ──────────────────────────────────────────────────
export function getTrackingData(): TrackingData {
  if (typeof window === "undefined") return {}
  try {
    const stored = sessionStorage.getItem(TRACKING_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

// ─── Visitor ID ──────────────────────────────────────────────────────────────
// Persistent first-party visitor ID across sessions
export function getVisitorId(): string {
  if (typeof window === "undefined") return ""
  try {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    return ""
  }
}

// ─── Source Mapping ──────────────────────────────────────────────────────────
export function mapUtmToSource(utmSource?: string): string {
  if (!utmSource) return "ORGANIC"
  const s = utmSource.toLowerCase()
  if (s.includes("facebook") || s.includes("meta")) return "META_ADS"
  if (s === "instagram" || s === "ig") return "INSTAGRAM"
  if (s.includes("google")) return "GOOGLE"
  if (s.includes("referral") || s.includes("friend")) return "REFERRAL"
  return "OTHER"
}

// ─── Event Tracking ──────────────────────────────────────────────────────────
// Fires event to all configured platforms (Meta Pixel, GA4)
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
  }
}

export function trackEvent(name: string, params?: Record<string, string>): void {
  if (typeof window === "undefined") return

  // Meta Pixel
  if (window.fbq) {
    window.fbq("trackCustom", name, params)
  }

  // GA4
  if (window.gtag) {
    window.gtag("event", name, params)
  }
}

// ─── Conversion Tracking ─────────────────────────────────────────────────────
// eventId: optional event ID from server-side Meta CAPI for deduplication
export function trackConversion(type: "Lead" | "CompleteRegistration" | "Contact", value?: number, eventId?: string | null): void {
  if (typeof window === "undefined") return

  // Meta Pixel standard events (with eventID for server-side dedup)
  if (window.fbq) {
    const data = value ? { value, currency: "INR" } : undefined
    if (eventId) {
      window.fbq("track", type, data, { eventID: eventId })
    } else {
      window.fbq("track", type, data)
    }
  }

  // GA4 standard events
  if (window.gtag) {
    const eventMap: Record<string, string> = {
      Lead: "generate_lead",
      CompleteRegistration: "sign_up",
      Contact: "contact",
    }
    window.gtag("event", eventMap[type] || type, value ? { value, currency: "INR" } : undefined)
  }
}
