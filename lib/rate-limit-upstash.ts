// lib/rate-limit-upstash.ts
import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"
import crypto from "crypto"

const redis = Redis.fromEnv()

// Shared ephemeral cache absorbs brief Upstash blips.
const cvEphemeral = new Map<string, number>()

// Per-seeker hourly: 10/hour
export const seekerHourly = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  prefix: "cv-upload:seeker-h",
  ephemeralCache: cvEphemeral,
})

// Per-seeker daily: 30/day
export const seekerDaily = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 d"),
  prefix: "cv-upload:seeker-d",
  ephemeralCache: cvEphemeral,
})

// Per-IP daily: 50/day — blocks multi-account farming from same IP
export const ipDaily = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, "1 d"),
  prefix: "cv-upload:ip-d",
  ephemeralCache: cvEphemeral,
})

// Global daily circuit breaker: 5000/day
export const globalDaily = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5000, "1 d"),
  prefix: "cv-upload:global-d",
  ephemeralCache: cvEphemeral,
})

// Job-ingest limiters — defense-in-depth against CRON_SECRET leak.
// Sized for Kimi Claw's expected cadence (6 daily runs, each POSTing
// 1-N batches per source) while making secret-leak abuse painful.
const ingestEphemeral = new Map<string, number>()

export const ingestPerIp = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 h"),
  prefix: "ingest:ip-h",
  ephemeralCache: ingestEphemeral,
})

export const ingestGlobalDaily = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1000, "1 d"),
  prefix: "ingest:global-d",
  ephemeralCache: ingestEphemeral,
})

// Auth limiters — migrated from in-memory
const authEphemeral = new Map<string, number>()

export const authLoginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "auth:login",
  ephemeralCache: authEphemeral,
})

export const authRegisterLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "auth:register",
  ephemeralCache: authEphemeral,
})

export interface RateLimitFailure {
  layer: "seekerHourly" | "seekerDaily" | "ipDaily" | "globalDaily"
  retryAfterSeconds: number
}

async function safeLimit(
  limiter: Ratelimit,
  key: string,
  layer: string
): Promise<{ success: boolean; reset: number }> {
  try {
    return await limiter.limit(key)
  } catch (err) {
    console.warn("rate-limit layer failed, failing closed", {
      layer,
      key,
      err: err instanceof Error ? err.message : String(err),
    })
    // Fail closed: deny briefly, let user retry
    return { success: false, reset: Date.now() + 30_000 }
  }
}

/**
 * Check all four layers in order. Returns null if allowed, or the first
 * layer that rejected (short-circuits remaining checks).
 */
export async function checkAllLayers(
  seekerId: string,
  ip: string
): Promise<RateLimitFailure | null> {
  const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 32)

  const checks: Array<[RateLimitFailure["layer"], Ratelimit, string]> = [
    ["globalDaily", globalDaily, "global"],
    ["ipDaily", ipDaily, ipHash],
    ["seekerDaily", seekerDaily, seekerId],
    ["seekerHourly", seekerHourly, seekerId],
  ]

  for (const [layer, limiter, key] of checks) {
    const result = await safeLimit(limiter, key, layer)
    if (!result.success) {
      return {
        layer,
        retryAfterSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
      }
    }
  }

  return null
}

/**
 * Extract a trustable client IP.
 *
 * On Vercel, `x-vercel-forwarded-for` is edge-injected and cannot be client-spoofed.
 * `x-forwarded-for` is a comma-separated chain where the LAST entry is the
 * most-recently-trusted hop; the FIRST entry can be anything the client appended.
 * Clients cannot forge the last hop because the edge proxy overwrites it.
 */
export function extractIp(request: Request): string {
  const vercelIp = request.headers.get("x-vercel-forwarded-for")?.trim()
  if (vercelIp) {
    // x-vercel-forwarded-for can itself be comma-separated in multi-proxy setups;
    // take the last value for the edge's authoritative view.
    const parts = vercelIp.split(",").map((s) => s.trim()).filter(Boolean)
    return parts[parts.length - 1] || "unknown"
  }
  const xff = request.headers.get("x-forwarded-for")
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean)
    return parts[parts.length - 1] || "unknown"
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown"
}
