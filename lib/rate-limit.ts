import { NextRequest, NextResponse } from 'next/server'

interface RateLimitStore {
  count: number
  resetTime: number
}

// In-memory store (use Redis in production for distributed systems)
const store = new Map<string, RateLimitStore>()

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
}

/**
 * Simple in-memory rate limiter
 * For production with multiple instances, use Redis
 */
export function rateLimit(config: RateLimitConfig) {
  const { windowMs, maxRequests } = config

  return async (req: NextRequest): Promise<NextResponse | null> => {
    // Get identifier (IP address + user agent for uniqueness)
    const identifier =
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      req.headers.get('cf-connecting-ip') ||
      'unknown'

    const key = `${identifier}:${req.nextUrl.pathname}`
    const now = Date.now()

    // Get or create rate limit entry
    let entry = store.get(key)

    // Reset if window expired
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      }
      store.set(key, entry)
    }

    // Increment request count
    entry.count++

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      const resetIn = Math.ceil((entry.resetTime - now) / 1000)
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
          retryAfter: resetIn,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(resetIn),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(entry.resetTime / 1000)),
          },
        }
      )
    }

    // Add rate limit headers to response (caller should add these)
    return null // No rate limit exceeded
  }
}

/**
 * Cleanup old entries periodically (call this on server startup)
 */
export function startRateLimitCleanup() {
  setInterval(
    () => {
      const now = Date.now()
      for (const [key, entry] of store.entries()) {
        if (now > entry.resetTime) {
          store.delete(key)
        }
      }
    },
    60000 // Clean up every minute
  )
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // Strict: 10 requests per minute (for sensitive operations)
  STRICT: { windowMs: 60000, maxRequests: 10 },

  // Standard: 100 requests per 15 minutes (for most operations)
  STANDARD: { windowMs: 900000, maxRequests: 100 },

  // Moderate: 30 requests per minute (for API endpoints)
  MODERATE: { windowMs: 60000, maxRequests: 30 },

  // Lenient: 100 requests per minute (for read operations)
  LENIENT: { windowMs: 60000, maxRequests: 100 },
}
