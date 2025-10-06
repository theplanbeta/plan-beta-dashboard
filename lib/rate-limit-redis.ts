import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

// Redis client (lazily initialized)
let redisClient: any = null
let useRedis = false

// Fallback: In-memory store
interface RateLimitStore {
  count: number
  resetTime: number
}
const memoryStore = new Map<string, RateLimitStore>()

/**
 * Initialize Redis connection (optional)
 * Falls back to in-memory if Redis is unavailable
 */
async function getRedisClient() {
  if (redisClient) return redisClient

  // Only attempt Redis if URL is configured
  if (!process.env.REDIS_URL) {
    console.log('[Rate Limiter] No REDIS_URL configured, using in-memory store')
    return null
  }

  try {
    // Dynamically import ioredis only if needed
    const Redis = (await import('ioredis' as any)).default
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 3) {
          console.warn('[Rate Limiter] Redis connection failed, falling back to memory store')
          useRedis = false
          return null
        }
        return Math.min(times * 50, 2000)
      },
    })

    redisClient.on('error', (err: Error) => {
      console.error('[Rate Limiter] Redis error:', err.message)
      useRedis = false
    })

    redisClient.on('connect', () => {
      console.log('[Rate Limiter] Connected to Redis')
      useRedis = true
    })

    await redisClient.ping()
    useRedis = true
    return redisClient
  } catch (error) {
    console.warn('[Rate Limiter] Failed to initialize Redis, using in-memory store:', error)
    useRedis = false
    return null
  }
}

/**
 * Redis-based rate limiter with automatic fallback to in-memory
 */
export function rateLimitRedis(config: RateLimitConfig) {
  const { windowMs, maxRequests } = config

  return async (req: NextRequest): Promise<NextResponse | null> => {
    // Get identifier
    const identifier =
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      req.headers.get('cf-connecting-ip') ||
      'unknown'

    const key = `rate-limit:${identifier}:${req.nextUrl.pathname}`
    const now = Date.now()

    // Try Redis first
    const redis = await getRedisClient()

    if (redis && useRedis) {
      return rateLimitWithRedis(redis, key, windowMs, maxRequests, now)
    }

    // Fallback to in-memory
    return rateLimitWithMemory(key, windowMs, maxRequests, now)
  }
}

/**
 * Redis-based rate limiting logic
 */
async function rateLimitWithRedis(
  redis: any,
  key: string,
  windowMs: number,
  maxRequests: number,
  now: number
): Promise<NextResponse | null> {
  try {
    const windowStart = now - windowMs
    const pipeline = redis.pipeline()

    // Remove old entries
    pipeline.zremrangebyscore(key, 0, windowStart)

    // Count current requests in window
    pipeline.zcard(key)

    // Add current request
    pipeline.zadd(key, now, `${now}`)

    // Set expiry
    pipeline.expire(key, Math.ceil(windowMs / 1000))

    const results = await pipeline.exec()
    const count = results[1][1] as number

    if (count >= maxRequests) {
      const resetTime = now + windowMs
      const resetIn = Math.ceil(windowMs / 1000)

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
            'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
          },
        }
      )
    }

    return null // No rate limit exceeded
  } catch (error) {
    console.error('[Rate Limiter] Redis operation failed, falling back to memory:', error)
    useRedis = false
    return rateLimitWithMemory(key, windowMs, maxRequests, now)
  }
}

/**
 * In-memory rate limiting logic (fallback)
 */
function rateLimitWithMemory(
  key: string,
  windowMs: number,
  maxRequests: number,
  now: number
): NextResponse | null {
  let entry = memoryStore.get(key)

  // Reset if window expired
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
    }
    memoryStore.set(key, entry)
  }

  entry.count++

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

  return null
}

/**
 * Cleanup old entries periodically (for memory store)
 */
export function startRateLimitCleanup() {
  setInterval(
    () => {
      const now = Date.now()
      for (const [key, entry] of memoryStore.entries()) {
        if (now > entry.resetTime) {
          memoryStore.delete(key)
        }
      }
    },
    60000 // Clean up every minute
  )
}

// Predefined rate limit configurations
export const RATE_LIMITS_REDIS = {
  STRICT: { windowMs: 60000, maxRequests: 10 },
  MODERATE: { windowMs: 60000, maxRequests: 30 },
  LENIENT: { windowMs: 60000, maxRequests: 100 },
}
