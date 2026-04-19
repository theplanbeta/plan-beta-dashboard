"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

const STORAGE_KEY = "pb-profile-banner-dismissed-at"
const REDISPLAY_MS = 7 * 24 * 60 * 60 * 1000

export function ProfileCompletionBanner({ profileCompleteness }: { profileCompleteness: number }) {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (profileCompleteness >= 50) return
    try {
      const storedAt = Number(localStorage.getItem(STORAGE_KEY) ?? "0")
      if (Date.now() - storedAt > REDISPLAY_MS) setDismissed(false)
    } catch {
      setDismissed(false)
    }
  }, [profileCompleteness])

  if (dismissed || profileCompleteness >= 50) return null

  return (
    <div className="amtlich-card mb-4 flex items-start gap-3" style={{ padding: "14px 16px" }}>
      <div className="flex-1">
        <div className="mono" style={{ fontSize: "var(--fs-mono-xs)" }}>
          Profile {profileCompleteness}% complete
        </div>
        <div
          style={{
            height: 4,
            background: "rgba(60,40,20,.15)",
            borderRadius: 2,
            overflow: "hidden",
            marginTop: 6,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${profileCompleteness}%`,
              background: "var(--ink, #141109)",
              transition: "width .3s ease",
            }}
          />
        </div>
        <p
          className="ink-soft"
          style={{ fontFamily: "var(--f-body)", fontSize: "0.88rem", marginTop: 8 }}
        >
          Your matches get sharper when you add work experience and skills.{" "}
          <Link href="/jobs-app/profile" className="underline font-semibold">
            Add details →
          </Link>
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(STORAGE_KEY, String(Date.now()))
          } catch {
            // Private mode — just dismiss in-memory for this session
          }
          setDismissed(true)
        }}
        aria-label="Dismiss"
        className="opacity-60 hover:opacity-100"
        style={{ background: "transparent", border: "none", fontSize: 20, lineHeight: 1, padding: "0 4px", cursor: "pointer" }}
      >
        ×
      </button>
    </div>
  )
}
