import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"

const limiter = rateLimit(RATE_LIMITS.MODERATE)

// UUID v4 pattern for validation
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Known bot patterns (checked against User-Agent header, not stored)
const BOT_PATTERNS = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|mediapartners|googleother|headlesschrome|phantomjs|prerender/i

function isBot(request: NextRequest): boolean {
  const ua = request.headers.get("user-agent")
  if (!ua) return true // No UA = likely a bot or script
  return BOT_PATTERNS.test(ua)
}

// POST /api/analytics/pageview — Persist pageview data for identity resolution
export async function POST(request: NextRequest) {
  try {
    // Bot filtering (check UA header server-side, never store it)
    if (isBot(request)) {
      return NextResponse.json({ ok: false }, { status: 200 }) // Silent reject
    }

    const rateLimitResult = await limiter(request)
    if (rateLimitResult) return rateLimitResult

    // Body size guard (2KB limit)
    const contentLength = parseInt(request.headers.get("content-length") || "0", 10)
    if (contentLength > 2048) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const body = await request.json()
    const { type } = body

    if (type === "pageview") {
      return handlePageView(request, body)
    } else if (type === "pagehide") {
      return handlePageHide(body)
    }

    return NextResponse.json({ ok: false }, { status: 400 })
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 }) // Silent fail
  }
}

async function handlePageView(
  request: NextRequest,
  body: {
    visitorId?: string
    sessionId?: string
    path?: string
    referrer?: string
    deviceType?: string
    timestamp?: string
  }
) {
  const { visitorId, sessionId, path, referrer, deviceType } = body

  // Validate required fields
  if (!path || typeof path !== "string" || path.length > 500) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  if (!visitorId || !UUID_RE.test(visitorId)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  if (!sessionId || !UUID_RE.test(sessionId)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // Reject internal referrers (defense-in-depth)
  let cleanReferrer = referrer || null
  if (cleanReferrer) {
    try {
      const refHost = new URL(cleanReferrer).hostname
      if (refHost.includes("theplanbeta.com") || refHost.includes("planbeta.app") || refHost.includes("localhost")) {
        cleanReferrer = null
      }
    } catch {
      cleanReferrer = null // Invalid URL
    }
  }

  const country = request.headers.get("x-vercel-ip-country") || null

  const pageView = await prisma.pageView.create({
    data: {
      visitorId,
      sessionId,
      path,
      referrer: cleanReferrer,
      deviceType: deviceType || null,
      country,
    },
  })

  return NextResponse.json({ ok: true, pageViewId: pageView.id })
}

async function handlePageHide(body: {
  pageViewId?: string
  duration?: number
  scrollDepth?: number
}) {
  const { pageViewId, duration, scrollDepth } = body

  // Validate pageViewId (cuid format — alphanumeric, starts with 'c', 25 chars)
  if (!pageViewId || typeof pageViewId !== "string" || pageViewId.length < 20 || pageViewId.length > 30) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // Validate duration (0-3600 seconds = max 1 hour per page)
  const cleanDuration = typeof duration === "number" && duration >= 0 && duration <= 3600
    ? Math.round(duration)
    : null

  // Validate scrollDepth (0-100)
  const cleanScrollDepth = typeof scrollDepth === "number" && scrollDepth >= 0 && scrollDepth <= 100
    ? Math.round(scrollDepth)
    : null

  // Update by ID — simple, no complex matching
  await prisma.pageView.update({
    where: { id: pageViewId },
    data: {
      ...(cleanDuration !== null && { duration: cleanDuration }),
      ...(cleanScrollDepth !== null && { scrollDepth: cleanScrollDepth }),
    },
  }).catch(() => {
    // Silent fail — pageViewId may not exist (race condition, cleared storage)
  })

  return NextResponse.json({ ok: true })
}
