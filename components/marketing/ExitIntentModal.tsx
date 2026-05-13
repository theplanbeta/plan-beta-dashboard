"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ctaForProfile, type ReaderProfile } from "@/lib/blog-cta"
import { acquireModal, releaseModal } from "@/lib/modal-bus"
import { trackEvent } from "@/lib/tracking"

const SUPPRESS_DAYS = 7
const STORAGE_KEY = "pb-exit-intent-dismissed"
const MIN_ON_PAGE_MS = 10_000
const MOBILE_MIN_MS = 30_000
const MOBILE_MIN_SCROLL = 0.4

// Pages where the user is already mid-funnel — never interrupt with the modal.
const EXCLUDE_PREFIXES = [
  "/contact",
  "/dashboard",
  "/jobs-app",
  "/login",
  "/admin",
  "/api",
  // The /go/* short-link redirector pages and similar
  "/go",
]

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null
    // touch to verify access
    window.localStorage.getItem("__pb_probe__")
    return window.localStorage
  } catch {
    return null
  }
}

function isSuppressed(): boolean {
  const ls = safeLocalStorage()
  if (!ls) return false
  try {
    const raw = ls.getItem(STORAGE_KEY)
    if (!raw) return false
    const dismissedAt = parseInt(raw, 10)
    if (Number.isNaN(dismissedAt)) return false
    return Date.now() - dismissedAt < SUPPRESS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

function markSuppressed() {
  const ls = safeLocalStorage()
  if (!ls) return
  try {
    ls.setItem(STORAGE_KEY, Date.now().toString())
  } catch {
    /* no-op */
  }
}

function hasCookieConsent(): boolean {
  try {
    const raw = localStorage.getItem("pb-cookie-consent")
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return Boolean(parsed?.analytics || parsed?.accepted)
  } catch {
    return false
  }
}

function pathnameToProfile(pathname: string): ReaderProfile {
  if (pathname.startsWith("/nurses") || pathname.startsWith("/jobs/nursing")) return "nurse"
  if (pathname.startsWith("/jobs/engineering")) return "engineer"
  if (pathname.startsWith("/jobs/student-jobs") || pathname.startsWith("/german-classes")) return "student"
  if (pathname.startsWith("/germany-pathway") || pathname.startsWith("/jobs/india"))
    return "visa-seeker"
  return "general"
}

function readMetaProfile(): ReaderProfile | null {
  if (typeof document === "undefined") return null
  const el = document.querySelector("[data-pb-reader-profile]")
  const v = el?.getAttribute("data-pb-reader-profile")
  if (!v) return null
  const valid: ReaderProfile[] = [
    "nurse",
    "engineer",
    "it",
    "student",
    "visa-seeker",
    "general",
  ]
  return (valid as string[]).includes(v) ? (v as ReaderProfile) : null
}

export function ExitIntentModal() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<ReaderProfile>("general")
  const mountedAtRef = useRef<number>(Date.now())
  const acquiredRef = useRef(false)
  const triggeredRef = useRef(false)

  // Reset timer on route change so SPA navigation doesn't fire the modal mid-engagement.
  useEffect(() => {
    mountedAtRef.current = Date.now()
    triggeredRef.current = false
  }, [pathname])

  // Decide whether to arm exit-intent for this page
  const excluded = EXCLUDE_PREFIXES.some((p) => pathname.startsWith(p))

  useEffect(() => {
    if (excluded) return
    if (isSuppressed()) return
    if (!hasCookieConsent()) return

    const trigger = () => {
      if (triggeredRef.current) return
      const elapsed = Date.now() - mountedAtRef.current
      if (elapsed < MIN_ON_PAGE_MS) return

      // Resolve profile at trigger time, not mount time — gives blog detail
      // page time to render its [data-pb-reader-profile] root.
      const resolved = readMetaProfile() ?? pathnameToProfile(pathname)
      setProfile(resolved)

      if (!acquireModal("exit-intent")) return // another modal owns the screen
      acquiredRef.current = true
      triggeredRef.current = true
      setOpen(true)
      try {
        trackEvent("exit_intent_shown", { profile: resolved, pathname })
      } catch {
        /* tracking optional */
      }
    }

    const onMouseLeave = (e: MouseEvent) => {
      // Cursor must have actually left the viewport top.
      // `relatedTarget === null` is the canonical "out of window" signal;
      // we also require Y near the top to avoid menu-bar false positives.
      if (e.clientY <= 5 && e.relatedTarget === null) {
        trigger()
      }
    }

    const onVisibility = () => {
      if (document.visibilityState !== "hidden") return
      const elapsed = Date.now() - mountedAtRef.current
      if (elapsed < MOBILE_MIN_MS) return
      const doc = document.documentElement
      const scrollPct =
        (window.scrollY || doc.scrollTop) /
        Math.max(1, (doc.scrollHeight || 0) - (doc.clientHeight || 0))
      if (scrollPct < MOBILE_MIN_SCROLL) return
      trigger()
    }

    // 2s mount delay before arming — avoids triggers during initial paint
    const armTimer = window.setTimeout(() => {
      document.addEventListener("mouseleave", onMouseLeave)
      document.addEventListener("visibilitychange", onVisibility)
    }, 2000)

    return () => {
      window.clearTimeout(armTimer)
      document.removeEventListener("mouseleave", onMouseLeave)
      document.removeEventListener("visibilitychange", onVisibility)
      if (acquiredRef.current) {
        releaseModal("exit-intent")
        acquiredRef.current = false
      }
    }
  }, [pathname, excluded])

  const close = (source: "dismiss" | "cta") => {
    setOpen(false)
    markSuppressed()
    if (acquiredRef.current) {
      releaseModal("exit-intent")
      acquiredRef.current = false
    }
    try {
      trackEvent(
        source === "cta" ? "exit_intent_cta_click" : "exit_intent_dismissed",
        { profile, pathname }
      )
    } catch {
      /* optional */
    }
  }

  if (!open) return null

  const cta = ctaForProfile(profile)
  const Primary = cta.primaryExternal ? "a" : Link
  const primaryProps = cta.primaryExternal
    ? { href: cta.primaryHref, target: "_blank", rel: "noopener noreferrer" }
    : { href: cta.primaryHref }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-intent-headline"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) close("dismiss")
      }}
    >
      <div className="relative w-full max-w-md bg-[#0f0f0f] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl">
        <button
          type="button"
          aria-label="Close"
          onClick={() => close("dismiss")}
          className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors p-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <span className="inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-emerald-500/15 text-emerald-300 rounded">
          {cta.eyebrow}
        </span>
        <h2
          id="exit-intent-headline"
          className="mt-3 text-2xl font-bold text-white leading-tight"
        >
          {cta.headline}
        </h2>
        <p className="mt-3 text-gray-400 text-sm leading-relaxed">{cta.body}</p>

        <div className="mt-6 flex flex-col gap-3">
          <Primary
            {...primaryProps}
            onClick={() => close("cta")}
            className="inline-flex items-center justify-center px-5 py-3 bg-primary text-white text-sm font-semibold rounded-full hover:bg-primary-dark transition-all"
          >
            {cta.primaryLabel}
          </Primary>
          <button
            type="button"
            onClick={() => close("dismiss")}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            No thanks — close this
          </button>
        </div>
      </div>
    </div>
  )
}
