/**
 * Jobs App rate limiter — per-key sliding window.
 *
 * This is an in-memory limiter intended as a first-pass cost damper, not
 * a security control. On Vercel serverless each lambda instance has its
 * own `buckets` Map, so a sufficiently motivated attacker can amplify
 * their limit by hitting multiple cold starts. For hard security limits
 * (e.g. brute-force protection on /auth/login) layer this with Upstash
 * Redis — TODO in the hardening backlog.
 *
 * Usage:
 *
 *   const limited = checkRateLimit(`login:${ip}:${email}`, RL.AUTH_LOGIN)
 *   if (limited) return limited
 *
 * The limiter returns a ready-to-return NextResponse (429) or null
 * if the request is within budget.
 */

import { NextResponse } from "next/server"

export interface RateLimitConfig {
  /** Max requests allowed in the window. */
  max: number
  /** Window length in milliseconds. */
  windowMs: number
  /** Human-readable label used in the 429 body. */
  label?: string
}

// Sliding-window timestamps keyed by caller-provided key.
const buckets = new Map<string, number[]>()

// Opportunistic cleanup: every ~100 writes, purge any bucket whose last
// entry is older than 1 hour. Keeps the map from growing unbounded on
// long-lived warm instances without needing a setInterval timer.
let writeCounter = 0
function maybeGc(now: number) {
  writeCounter++
  if (writeCounter % 100 !== 0) return
  const oneHourAgo = now - 60 * 60 * 1000
  for (const [k, arr] of buckets.entries()) {
    if (arr.length === 0 || arr[arr.length - 1] < oneHourAgo) {
      buckets.delete(k)
    }
  }
}

/**
 * Check if a request against `key` is allowed under `config`.
 * Returns:
 *   - `null` if allowed (and records the hit in the bucket),
 *   - a NextResponse with status 429 if the bucket is full.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): NextResponse | null {
  const now = Date.now()
  const windowStart = now - config.windowMs
  const existing = buckets.get(key) ?? []
  // Drop timestamps that have slid out of the window.
  const recent = existing.filter((t) => t > windowStart)

  if (recent.length >= config.max) {
    const oldest = recent[0]
    const retryAfter = Math.max(1, Math.ceil((oldest + config.windowMs - now) / 1000))
    return NextResponse.json(
      {
        error: "Too many requests",
        message:
          config.label ??
          `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.max),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil((oldest + config.windowMs) / 1000)),
        },
      }
    )
  }

  recent.push(now)
  buckets.set(key, recent)
  maybeGc(now)
  return null
}

/**
 * Extract a best-effort client identifier from the incoming request.
 * Prefer `x-real-ip` (set by Vercel) over `x-forwarded-for`.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  )
}

/** Canonical rate-limit configs used across the Jobs App routes. */
export const RL = {
  // Auth — per-IP and per-email
  AUTH_LOGIN: { max: 5, windowMs: 60_000, label: "Too many login attempts. Try again in a minute." },
  AUTH_REGISTER: { max: 3, windowMs: 60 * 60_000, label: "Too many sign-up attempts. Try again later." },

  // Expensive AI routes — per-seeker
  CV_GENERATE: { max: 3, windowMs: 60_000, label: "Generating CVs too quickly. Try again shortly." },
  ANSCHREIBEN_GENERATE: { max: 3, windowMs: 60_000, label: "Generating cover letters too quickly. Try again shortly." },
  JOB_DEEP_SCORE: { max: 30, windowMs: 60_000, label: "Too many job score requests." },
  SCREENSHOT_CLASSIFY: { max: 10, windowMs: 60_000, label: "Too many screenshot uploads." },
} as const satisfies Record<string, RateLimitConfig>
