"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

/**
 * Document Serial — renders a real-looking archival file number
 * in the top-right of every screen. Context-aware: reads the route
 * and produces a fresh suffix. Free delight, zero API cost.
 *
 * Example: DZ-2026-0412 · 11.04.2026 · FILE OPEN
 */

const ROUTE_SUFFIX: Record<string, string> = {
  "/jobs-app": "FILE OPEN",
  "/jobs-app/jobs": "INDEX VIEW",
  "/jobs-app/applications": "CASE LOAD",
  "/jobs-app/cv-archive": "ARCHIVE",
  "/jobs-app/onboarding": "INTAKE",
  "/jobs-app/profile": "SUBJECT",
}

function makeSerial(): string {
  const year = new Date().getFullYear()
  const stored = sessionStorage.getItem("dz-serial")
  if (stored) return stored
  const num = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0")
  const serial = `DZ-${year}-${num}`
  sessionStorage.setItem("dz-serial", serial)
  return serial
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function suffixForPath(pathname: string): string {
  if (ROUTE_SUFFIX[pathname]) return ROUTE_SUFFIX[pathname]
  if (pathname.startsWith("/jobs-app/job/")) return "ITEM · VIEWING"
  if (pathname.startsWith("/jobs-app/applications/")) return "CASE · OPEN"
  return "FILE OPEN"
}

export default function DocumentSerial() {
  const pathname = usePathname() ?? "/jobs-app"
  const suffix = suffixForPath(pathname)
  // Compute serial + date only after mount so SSR markup matches the
  // first client render (avoids React hydration error #418, since both
  // values are nondeterministic — random and timezone-dependent).
  const [meta, setMeta] = useState<{ serial: string; date: string } | null>(null)

  useEffect(() => {
    setMeta({ serial: makeSerial(), date: formatDate() })
  }, [])

  return (
    <span className="amtlich-serial">
      <span suppressHydrationWarning>{meta?.serial ?? "DZ-––––-––––"}</span>
      <span className="sep">·</span>
      <span suppressHydrationWarning>{meta?.date ?? "––/––/––––"}</span>
      <span className="sep">·</span>
      <span>{suffix}</span>
    </span>
  )
}
