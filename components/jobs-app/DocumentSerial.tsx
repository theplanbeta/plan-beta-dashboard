"use client"

import { usePathname } from "next/navigation"

/**
 * Document Serial — renders a real-looking archival file number
 * in the top-right of every screen. Context-aware: reads the route
 * and produces a fresh suffix. Free delight, zero API cost.
 *
 * Example: PB-2026-0412 · 11.04.2026 · FILE OPEN
 */

const ROUTE_SUFFIX: Record<string, string> = {
  "/jobs-app": "FILE OPEN",
  "/jobs-app/jobs": "INDEX VIEW",
  "/jobs-app/applications": "CASE LOAD",
  "/jobs-app/cvs": "ARCHIVE",
  "/jobs-app/onboarding": "INTAKE",
  "/jobs-app/profile": "SUBJECT",
}

function makeSerial(): string {
  const year = new Date().getFullYear()
  // Deterministic per-session random so it stays stable on a given visit
  if (typeof window === "undefined") return `PB-${year}-0000`
  const stored = sessionStorage.getItem("pb-serial")
  if (stored) return stored
  const num = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0")
  const serial = `PB-${year}-${num}`
  sessionStorage.setItem("pb-serial", serial)
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
  const serial = makeSerial()
  const date = formatDate()
  const suffix = suffixForPath(pathname)

  return (
    <span className="amtlich-serial">
      <span>{serial}</span>
      <span className="sep">·</span>
      <span>{date}</span>
      <span className="sep">·</span>
      <span>{suffix}</span>
    </span>
  )
}
