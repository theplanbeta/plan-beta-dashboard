"use client"

import { useEffect, useState, useRef } from "react"
import { usePathname } from "next/navigation"
import Script from "next/script"
import { captureTrackingData, trackEvent } from "@/lib/tracking"
import { getConsent } from "@/components/marketing/CookieConsent"

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export default function TrackingProvider() {
  const [consented, setConsented] = useState(false)
  const scrollMilestonesRef = useRef(new Set<number>())
  const pathname = usePathname()
  const isFirstRender = useRef(true)

  // Capture UTM params on mount
  useEffect(() => {
    captureTrackingData()
  }, [])

  // Listen for consent
  useEffect(() => {
    const consent = getConsent()
    if (consent?.analytics) setConsented(true)

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.analytics) {
        setConsented(true)
        // Update Google Consent Mode to granted
        if (typeof window !== "undefined" && window.gtag) {
          window.gtag("consent", "update", {
            ad_storage: "granted",
            ad_user_data: "granted",
            ad_personalization: "granted",
            analytics_storage: "granted",
          })
        }
      }
    }
    window.addEventListener("consent-updated", handler)
    return () => window.removeEventListener("consent-updated", handler)
  }, [])

  // On mount, if consent was already granted (returning user), update consent mode
  useEffect(() => {
    if (consented && typeof window !== "undefined" && window.gtag) {
      window.gtag("consent", "update", {
        ad_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted",
        analytics_storage: "granted",
      })
    }
  }, [consented])

  // Track SPA page views on route changes
  useEffect(() => {
    // Skip the first render (initial page view is handled by the script injection)
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (!consented) return

    // Fire Meta Pixel PageView on route change
    if (META_PIXEL_ID && typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "PageView")
    }

    // Fire GA4 page_view on route change
    if (GA_MEASUREMENT_ID && typeof window !== "undefined" && window.gtag) {
      window.gtag("config", GA_MEASUREMENT_ID, { page_path: pathname })
    }

    // Reset scroll milestones for the new page
    scrollMilestonesRef.current.clear()
  }, [pathname, consented])

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

  return (
    <>
      {/* GA4 — always load with consent mode defaults (denied until user consents) */}
      {GA_MEASUREMENT_ID && (
        <>
          <Script
            id="gtag-consent-defaults"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('consent', 'default', {
                  'ad_storage': 'denied',
                  'ad_user_data': 'denied',
                  'ad_personalization': 'denied',
                  'analytics_storage': 'denied'
                });
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', {
                  page_path: window.location.pathname,
                });
              `,
            }}
          />
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
        </>
      )}

      {/* Meta Pixel — only if env var set AND user consented */}
      {META_PIXEL_ID && consented && (
        <>
          <Script
            id="meta-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${META_PIXEL_ID}');
                fbq('track', 'PageView');
              `,
            }}
          />
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}
    </>
  )
}
