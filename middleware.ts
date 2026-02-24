import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const path = request.nextUrl.pathname
  const hostname = request.headers.get("host") || ""

  // ─── Domain-based routing ─────────────────────────────────────────────
  // theplanbeta.com → marketing site (rewrite root to /site)
  const isPublicDomain = hostname.includes("theplanbeta.com")

  if (isPublicDomain) {
    // Root → /site (marketing homepage)
    if (path === "/") {
      return NextResponse.rewrite(new URL("/site", request.url))
    }
    // Block dashboard/login/api access on public domain
    if (path.startsWith("/dashboard") || path === "/login" || path.startsWith("/api/auth")) {
      return NextResponse.redirect(new URL("/site", request.url))
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
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://connect.facebook.net https://www.googletagmanager.com https://checkout.razorpay.com",
    "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.resend.com https://sentry.io https://vitals.vercel-insights.com https://va.vercel-scripts.com https://www.facebook.com https://www.google-analytics.com https://region1.google-analytics.com https://lumberjack.razorpay.com https://api.razorpay.com",
    "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
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
    "/privacy",
    "/terms",
  ],
}
