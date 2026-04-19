// lib/rate-limit-upstash.ts
import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"
import crypto from "crypto"

const redis = Redis.fromEnv()

// Per-seeker hourly: 10/hour
export const seekerHourly = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  prefix: "cv-upload:seeker-h",
})

// Per-seeker daily: 30/day
export const seekerDaily = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 d"),
  prefix: "cv-upload:seeker-d",
})

// Per-IP daily: 50/day — blocks multi-account farming from same IP
export const ipDaily = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, "1 d"),
  prefix: "cv-upload:ip-d",
})

// Global daily circuit breaker: 5000/day
export const globalDaily = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5000, "1 d"),
  prefix: "cv-upload:global-d",
})

export interface RateLimitFailure {
  layer: "seekerHourly" | "seekerDaily" | "ipDaily" | "globalDaily"
  retryAfterSeconds: number
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
    const result = await limiter.limit(key)
    if (!result.success) {
      return {
        layer,
        retryAfterSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
      }
    }
  }

  return null
}

export function extractIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  return request.headers.get("x-real-ip") ?? "unknown"
}
