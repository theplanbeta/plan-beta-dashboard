import { NextResponse } from "next/server"
import crypto from "node:crypto"

/**
 * Google OAuth — start.
 *
 * Builds the Google consent URL, sets a CSRF state cookie, and redirects.
 * The callback route verifies the cookie matches the returned state.
 */
export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dayzero.xyz"

  if (!clientId) {
    return NextResponse.json(
      { error: "Google sign-in is not configured" },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(request.url)
  const next = searchParams.get("next") || "/jobs-app/jobs"

  const state = crypto.randomBytes(24).toString("hex")
  const redirectUri = `${appUrl}/api/jobs-app/auth/google/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "select_account",
  })

  const consentUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  const response = NextResponse.redirect(consentUrl)
  response.cookies.set("pb-google-state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  })
  response.cookies.set("pb-google-next", next, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  })
  return response
}
