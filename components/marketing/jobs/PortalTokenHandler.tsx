"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { usePortalAuth } from "./JobPortalAuthProvider"

/**
 * Handles token extraction from URL params after Stripe checkout or magic link.
 * - ?subscribed=true&token=xxx → from Stripe success
 * - ?magic=xxx → from magic link email → verify and get portal token
 */
export function PortalTokenHandler() {
  const searchParams = useSearchParams()
  const { login } = usePortalAuth()

  useEffect(() => {
    const sessionId = searchParams.get("session_id")
    const magic = searchParams.get("magic")

    if (sessionId && searchParams.get("subscribed")) {
      // Exchange Stripe session_id for a portal JWT
      fetch("/api/subscriptions/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            login(data.token)
          }
        })
        .catch(() => {})
        .finally(() => {
          const url = new URL(window.location.href)
          url.searchParams.delete("session_id")
          url.searchParams.delete("subscribed")
          window.history.replaceState({}, "", url.toString())
        })
    } else if (magic) {
      // Verify magic link token and get portal token
      fetch(`/api/subscriptions/magic-link?token=${encodeURIComponent(magic)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            login(data.token)
          }
        })
        .catch(() => {})
        .finally(() => {
          const url = new URL(window.location.href)
          url.searchParams.delete("magic")
          window.history.replaceState({}, "", url.toString())
        })
    }
  }, [searchParams, login])

  return null
}
