import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const path = request.nextUrl.pathname

  // Redirect to dashboard if accessing login while authenticated
  if (path === "/login" && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Redirect to login if accessing dashboard without auth
  if (path.startsWith("/dashboard") && !token) {
    return NextResponse.redirect(new URL("/login", request.url))
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
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval/inline
    "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.resend.com https://sentry.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')

  response.headers.set('Content-Security-Policy', cspDirectives)

  return response
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
  ],
}
