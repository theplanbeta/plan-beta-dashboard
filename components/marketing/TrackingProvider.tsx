"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { usePathname } from "next/navigation"
import { captureTrackingData, trackEvent } from "@/lib/tracking"
import { getConsent } from "@/components/marketing/CookieConsent"

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

// Debug helper — check console on production to verify GA4 is working
function dbg(msg: string, data?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.location.search.includes("debug_ga")) {
    console.log(`[GA4] ${msg}`, data || "")
  }
}

export default function TrackingProvider() {
  const [consented, setConsented] = useState(false)
  const [gtagReady, setGtagReady] = useState(false)
  const scrollMilestonesRef = useRef(new Set<number>())
  const pathname = usePathname()
  const consentFiredRef = useRef(false)
  const lastPageViewRef = useRef("")

  // Capture UTM params on mount
  useEffect(() => {
    captureTrackingData()
  }, [])

  // Manually inject GA4 scripts (bypasses Next.js Script timing issues)
  useEffect(() => {
    if (!GA_MEASUREMENT_ID) {
      dbg("No GA_MEASUREMENT_ID env var set")
      return
    }

    // Skip if already initialized
    if (window.gtag) {
      dbg("gtag already exists, skipping init")
      setGtagReady(true)
      return
    }

    dbg("Initializing GA4", { id: GA_MEASUREMENT_ID })

    // 1. Define dataLayer and gtag function
    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments)
    }

    // 2. Set consent defaults BEFORE loading gtag.js
    window.gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
    })
    dbg("Consent defaults set to denied")

    // 3. Initialize gtag timestamp
    window.gtag("js", new Date())

    // 4. Configure GA4 — disable automatic page_view (we fire manually after consent)
    window.gtag("config", GA_MEASUREMENT_ID, {
      page_path: window.location.pathname,
      send_page_view: false,
    })
    dbg("Config set with send_page_view: false")

    // 5. Load the external gtag.js script
    const script = document.createElement("script")
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
    script.async = true
    script.onload = () => {
      dbg("gtag.js loaded successfully")
      setGtagReady(true)
    }
    script.onerror = () => {
      dbg("FAILED to load gtag.js — likely blocked by ad blocker or NextDNS")
    }
    document.head.appendChild(script)
  }, [])

  // Listen for consent changes
  useEffect(() => {
    const consent = getConsent()
    if (consent?.analytics) {
      dbg("Found existing consent in localStorage")
      setConsented(true)
    }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.analytics) {
        dbg("User just accepted cookies")
        setConsented(true)
      }
    }
    window.addEventListener("consent-updated", handler)
    return () => window.removeEventListener("consent-updated", handler)
  }, [])

  // Fire page_view helper
  const firePageView = useCallback((path: string, reason: string) => {
    if (!GA_MEASUREMENT_ID || !window.gtag) return

    // Deduplicate — don't fire same path twice in a row
    if (lastPageViewRef.current === path && reason !== "consent_granted") return
    lastPageViewRef.current = path

    window.gtag("event", "page_view", {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
    })
    dbg(`page_view fired (${reason})`, { path })
  }, [])

  // When consent is granted AND gtag is ready → update consent mode and fire page_view
  useEffect(() => {
    if (!consented || !gtagReady || !window.gtag) return

    // Update consent mode (only once)
    if (!consentFiredRef.current) {
      window.gtag("consent", "update", {
        ad_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted",
        analytics_storage: "granted",
      })
      consentFiredRef.current = true
      dbg("Consent updated to granted")
    }

    // Fire page_view for current page
    firePageView(pathname, "consent_granted")
  }, [consented, gtagReady, pathname, firePageView])

  // Track SPA page views on route changes (after initial load)
  useEffect(() => {
    if (!consented || !gtagReady) return

    // Fire GA4 page_view
    firePageView(pathname, "route_change")

    // Fire Meta Pixel PageView
    if (META_PIXEL_ID && window.fbq) {
      window.fbq("track", "PageView")
    }

    // Reset scroll milestones for new page
    scrollMilestonesRef.current.clear()
  }, [pathname, consented, gtagReady, firePageView])

  // Internal first-party page view logging (consent-free, no PII)
  useEffect(() => {
    if (!pathname) return
    try {
      const data = JSON.stringify({
        path: pathname,
        referrer: document.referrer || undefined,
        deviceType: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
        timestamp: new Date().toISOString(),
      })
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/analytics/pageview", data)
      }
    } catch {
      // Silent fail — pageview logging is non-critical
    }
  }, [pathname])

  // Scroll depth tracking
  useEffect(() => {
    const milestones = [25, 50, 75, 100]
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight <= 0) return
      const percent = Math.round((scrollTop / docHeight) * 100)

      for (const milestone of milestones) {
        if (percent >= milestone && !scrollMilestonesRef.current.has(milestone)) {
          scrollMilestonesRef.current.add(milestone)
          trackEvent("scroll_depth", { depth: String(milestone) })
        }
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Load Meta Pixel when consented
  useEffect(() => {
    if (!META_PIXEL_ID || !consented) return
    if (window.fbq) return // Already loaded

    const script = document.createElement("script")
    script.async = true
    script.src = "https://connect.facebook.net/en_US/fbevents.js"
    document.head.appendChild(script)

    // Initialize fbq inline (doesn't need script to be loaded first)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const n: any = (window.fbq = function () {
      // eslint-disable-next-line prefer-rest-params
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    } as unknown as typeof window.fbq)
    if (!window._fbq) window._fbq = n
    n.push = n
    n.loaded = true
    n.version = "2.0"
    n.queue = []

    window.fbq!("init", META_PIXEL_ID)
    window.fbq!("track", "PageView")
  }, [consented])

  // No JSX needed — scripts are injected via useEffect
  return null
}
