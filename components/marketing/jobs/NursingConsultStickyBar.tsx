"use client"

import { useEffect, useState } from "react"
import { marketingWhatsAppUrl } from "@/lib/marketing-constants"
import { trackEvent } from "@/lib/tracking"

const WA_MESSAGE =
  "Hi Plan Beta! I'm a nurse looking at openings in Germany. Can you match me to the right hospital for my profile?"

const STORAGE_KEY = "pb-nursing-consult-bar-dismissed"
const SUPPRESS_DAYS = 7
const SHOW_AFTER_PX = 480 // ~viewport-ish on most screens; reveals after the hero

function safeReadDismissed(): boolean {
  try {
    if (typeof window === "undefined") return false
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const t = parseInt(raw, 10)
    if (Number.isNaN(t)) return false
    return Date.now() - t < SUPPRESS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

function safeWriteDismissed() {
  try {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEY, Date.now().toString())
  } catch {
    /* no-op */
  }
}

/**
 * Sticky consult nudge for /jobs/nursing.
 * - Hidden until the user scrolls past the hero (avoids being redundant with NicheHero / GermanLevelGapBanner above it).
 * - Sticky at the top of the viewport just under the fixed nav, so it survives scrolling the job list.
 * - Dismissible (7-day localStorage suppression).
 * - Tracks shown / click / dismissed events.
 * - z-index sits below the fixed nav (z-50) and the cookie banner (z-[60]).
 */
export function NursingConsultStickyBar() {
  const [armed, setArmed] = useState(false) // past dismissal check
  const [visible, setVisible] = useState(false) // scrolled past threshold

  // Arm once on mount — checks dismissal flag in a SSR-safe way
  useEffect(() => {
    if (safeReadDismissed()) return
    setArmed(true)
  }, [])

  // Reveal on scroll past hero
  useEffect(() => {
    if (!armed) return
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop
      setVisible(y > SHOW_AFTER_PX)
    }
    onScroll() // honor initial scroll position (deep links, refresh)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [armed])

  // Fire impression event exactly once
  useEffect(() => {
    if (!visible) return
    try {
      trackEvent("nursing_consult_bar_shown", {})
    } catch {
      /* tracking optional */
    }
  }, [visible])

  if (!armed || !visible) return null

  const waUrl = marketingWhatsAppUrl(WA_MESSAGE)

  return (
    <div
      role="region"
      aria-label="Plan Beta nursing consultation"
      className="fixed top-16 md:top-20 left-0 right-0 z-30"
    >
      <div className="mx-3 sm:mx-4 lg:mx-6 mt-3">
        <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/30 rounded-full shadow-lg shadow-emerald-500/10 flex items-center gap-3 px-4 py-2.5">
          <div className="flex-1 min-w-0 flex items-center gap-2 text-sm">
            <span className="hidden sm:inline-block shrink-0 text-base" aria-hidden="true">
              🩺
            </span>
            <span className="text-emerald-100 truncate">
              <span className="font-semibold text-white">Skip the search.</span>{" "}
              <span className="hidden sm:inline">Plan Beta matches nurses to German hospitals — no agent fees.</span>
              <span className="sm:hidden">We match nurses to hospitals.</span>
            </span>
          </div>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              try {
                trackEvent("nursing_consult_bar_click", {})
              } catch {
                /* tracking optional */
              }
            }}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-semibold rounded-full transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span>Talk to us</span>
          </a>
          <button
            type="button"
            onClick={() => {
              safeWriteDismissed()
              setArmed(false)
              try {
                trackEvent("nursing_consult_bar_dismissed", {})
              } catch {
                /* tracking optional */
              }
            }}
            aria-label="Dismiss"
            className="shrink-0 text-emerald-300/70 hover:text-white p-1 -m-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
