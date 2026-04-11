import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const path = request.nextUrl.pathname
  const hostname = request.headers.get("host") || ""

  // ─── Domain-based routing ─────────────────────────────────────────────
  // theplanbeta.com → marketing site with clean URLs (no /site prefix)
  const isPublicDomain = hostname.includes("theplanbeta.com")

  if (isPublicDomain) {
    // 301 redirect /site/* → /* (tells Google the clean URL is canonical)
    if (path === "/site" || path.startsWith("/site/")) {
      const cleanPath = path === "/site" ? "/" : path.replace(/^\/site/, "")
      return NextResponse.redirect(new URL(cleanPath, request.url), 301)
    }

    // Root → /site (homepage, internal rewrite)
    if (path === "/") {
      return NextResponse.rewrite(new URL("/site", request.url))
    }

    // Block dashboard/login/api access on public domain
    if (path.startsWith("/dashboard") || path === "/login" || path.startsWith("/api/auth")) {
      return NextResponse.redirect(new URL("/", request.url))
    }

    // Rewrite clean URLs to /site/* internally
    // Skip paths that are NOT marketing pages
    const skipPrefixes = ["/api", "/_next", "/go", "/privacy", "/terms", "/offline", "/dashboard", "/login"]
    const shouldSkip = skipPrefixes.some((p) => path === p || path.startsWith(p + "/"))
    if (!shouldSkip) {
      return NextResponse.rewrite(new URL("/site" + path, request.url))
    }
  }

  // ─── Plan Beta Day Zero routing ─────────────────────────────────────
  // Strict hostname match to prevent substring attacks. Each entry checks
  // either exact host or host+port for dev. Strip port, compare the base.
  const baseHost = hostname.split(":")[0]
  const DAY_ZERO_HOSTS = new Set([
    "dayzero.xyz",
    "www.dayzero.xyz",
    "jobs.planbeta.app", // legacy fallback during transition
    "dayzero.localhost",
    "jobs.localhost",
  ])
  const isDayZeroDomain = DAY_ZERO_HOSTS.has(baseHost)

  if (isDayZeroDomain) {
    // Block dashboard/login access on Day Zero domain
    if (path.startsWith("/dashboard") || path === "/login") {
      return NextResponse.redirect(new URL("/", request.url))
    }

    // Skip paths that don't need rewriting
    const skipPrefixes = ["/api", "/_next", "/jobs-app"]
    const shouldSkip = skipPrefixes.some((p) => path === p || path.startsWith(p + "/"))

    if (!shouldSkip) {
      // Rewrite / to /jobs-app, /jobs to /jobs-app/jobs, etc.
      const rewritePath = path === "/" ? "/jobs-app" : "/jobs-app" + path
      return NextResponse.rewrite(new URL(rewritePath, request.url))
    }
  }

  // ─── Dashboard auth ───────────────────────────────────────────────────
  // Redirect to dashboard if accessing login while authenticated
  if (path === "/login" && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Redirect to login if accessing dashboard without auth
  if (path.startsWith("/dashboard") && !token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Check if user needs to change password (after authentication)
  if (token && path.startsWith("/dashboard") && path !== "/dashboard/profile") {
    const requirePasswordChange = (token as any).requirePasswordChange

    if (requirePasswordChange === true) {
      console.log(`🔐 Redirecting user ${(token as any).email} to change password`)
      return NextResponse.redirect(new URL("/dashboard/profile?passwordChangeRequired=true", request.url))
    }
  }

  // Founder-only routes
  if (path.startsWith("/dashboard/activity")) {
    if (!token || (token as any).role !== "FOUNDER") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  // Create response with security headers
  const response = NextResponse.next()

  // Security Headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'geolocation=(self), microphone=(), camera=(self)')

  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://connect.facebook.net https://www.googletagmanager.com https://checkout.razorpay.com https://www.clarity.ms",
    "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
    "img-src 'self' data: https: https://*.public.blob.vercel-storage.com",
    "font-src 'self' data:",
    "connect-src 'self' https://api.resend.com https://sentry.io https://vitals.vercel-insights.com https://va.vercel-scripts.com https://www.facebook.com https://www.google-analytics.com https://region1.google-analytics.com https://lumberjack.razorpay.com https://api.razorpay.com https://*.public.blob.vercel-storage.com https://tiles.openfreemap.org https://www.clarity.ms https://*.clarity.ms",
    "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')

  response.headers.set('Content-Security-Policy', cspDirectives)

  return response
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/login",
    "/site/:path*",
    "/offline",
    "/privacy",
    "/terms",
    // Clean URL paths (rewritten to /site/* internally on theplanbeta.com)
    "/courses/:path*",
    "/nurses/:path*",
    "/about/:path*",
    "/blog/:path*",
    "/contact/:path*",
    "/jobs/:path*",
    "/opportunities/:path*",
    "/germany-pathway/:path*",
    "/spot-a-job/:path*",
    "/refer/:path*",
    "/german-classes/:path*",
    "/jobs-app/:path*",
  ],
}
