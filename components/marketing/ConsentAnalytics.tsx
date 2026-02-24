"use client"

import { useEffect, useState } from "react"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { getConsent } from "./CookieConsent"

export default function ConsentAnalytics() {
  const [analyticsConsented, setAnalyticsConsented] = useState(false)

  useEffect(() => {
    // Check existing consent on mount
    const consent = getConsent()
    if (consent?.analytics) setAnalyticsConsented(true)

    // Listen for new consent decisions
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.analytics) setAnalyticsConsented(true)
    }
    window.addEventListener("consent-updated", handler)
    return () => window.removeEventListener("consent-updated", handler)
  }, [])

  if (!analyticsConsented) return null

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  )
}
