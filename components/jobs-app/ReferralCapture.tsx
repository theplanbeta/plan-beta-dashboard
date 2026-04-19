"use client"

import { useEffect } from "react"

const STORAGE_KEY = "pb-jobs-referral-code"

/**
 * Capture ?ref= (or ?referral=) from the URL and stash it in localStorage so
 * the AuthForm can read it during signup. Mounted in jobs-app/layout.tsx.
 */
export function ReferralCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const code = params.get("ref") ?? params.get("referral") ?? null
      if (code && /^[A-Z0-9-]{6,30}$/i.test(code)) {
        localStorage.setItem(STORAGE_KEY, code.toUpperCase())
      }
    } catch {
      // Private mode or blocked storage — silently skip
    }
  }, [])
  return null
}

/** Read + clear the stored referral code. Call once during register. */
export function consumeStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v) localStorage.removeItem(STORAGE_KEY)
    return v
  } catch {
    return null
  }
}
