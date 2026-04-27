import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { signJobsAppToken } from "@/lib/jobs-app-auth"
import { generateReferralCode } from "@/lib/referral-code"

/**
 * Google OAuth — callback.
 *
 * Exchanges the authorization code for an ID token, verifies the CSRF state,
 * looks up or creates a JobSeeker, then issues the standard pb-jobs-app
 * cookie and redirects into the app.
 *
 * Account linking strategy:
 *   - If a JobSeeker with the Google email already exists, attach googleId
 *     to it (one-time link). Subsequent logins use googleId or email.
 *   - Otherwise, create a new password-less JobSeeker.
 */
export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dayzero.xyz"

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${appUrl}/jobs-app/auth?error=google_not_configured`
    )
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const stateParam = searchParams.get("state")
  const errorParam = searchParams.get("error")

  if (errorParam) {
    return NextResponse.redirect(
      `${appUrl}/jobs-app/auth?error=${encodeURIComponent(errorParam)}`
    )
  }
  if (!code || !stateParam) {
    return NextResponse.redirect(`${appUrl}/jobs-app/auth?error=missing_code`)
  }

  const cookieStore = await cookies()
  const expectedState = cookieStore.get("pb-google-state")?.value
  const next = cookieStore.get("pb-google-next")?.value || "/jobs-app/jobs"

  if (!expectedState || expectedState !== stateParam) {
    return NextResponse.redirect(`${appUrl}/jobs-app/auth?error=state_mismatch`)
  }

  const redirectUri = `${appUrl}/api/jobs-app/auth/google/callback`

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  if (!tokenRes.ok) {
    const detail = await tokenRes.text().catch(() => "")
    console.error("[google/callback] token exchange failed", tokenRes.status, detail.slice(0, 200))
    return NextResponse.redirect(`${appUrl}/jobs-app/auth?error=token_exchange_failed`)
  }

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string
    id_token?: string
  }
  if (!tokenJson.access_token) {
    return NextResponse.redirect(`${appUrl}/jobs-app/auth?error=no_access_token`)
  }

  // Fetch verified profile from Google's userinfo endpoint
  const userinfoRes = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    { headers: { Authorization: `Bearer ${tokenJson.access_token}` } }
  )
  if (!userinfoRes.ok) {
    return NextResponse.redirect(`${appUrl}/jobs-app/auth?error=userinfo_failed`)
  }
  const userinfo = (await userinfoRes.json()) as {
    sub: string
    email?: string
    email_verified?: boolean
    name?: string
    picture?: string
  }

  if (!userinfo.email || userinfo.email_verified === false) {
    return NextResponse.redirect(`${appUrl}/jobs-app/auth?error=email_unverified`)
  }

  const email = userinfo.email.toLowerCase()
  const name = userinfo.name?.trim() || email.split("@")[0]

  // Find existing seeker by googleId first, then by email
  let seeker = await prisma.jobSeeker.findUnique({ where: { googleId: userinfo.sub } })
  if (!seeker) {
    seeker = await prisma.jobSeeker.findUnique({ where: { email } })
    if (seeker) {
      // Link Google to existing email account
      seeker = await prisma.jobSeeker.update({
        where: { id: seeker.id },
        data: { googleId: userinfo.sub },
      })
    }
  }

  // Create new account if none exists
  if (!seeker) {
    let referralCode = generateReferralCode(name)
    for (let i = 0; i < 5; i++) {
      const collision = await prisma.jobSeeker.findUnique({
        where: { referralCode },
        select: { id: true },
      })
      if (!collision) break
      referralCode = generateReferralCode(name)
    }
    seeker = await prisma.jobSeeker.create({
      data: {
        email,
        googleId: userinfo.sub,
        name,
        referralCode,
      },
    })
  }

  const token = await signJobsAppToken(seeker.id, seeker.email, seeker.tier)

  // Determine final destination — new accounts go to onboarding
  const destination = seeker.onboardingComplete ? next : "/jobs-app/onboarding"
  const response = NextResponse.redirect(`${appUrl}${destination}`)
  response.cookies.set("pb-jobs-app", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  })
  // Clean up CSRF cookies
  response.cookies.delete("pb-google-state")
  response.cookies.delete("pb-google-next")
  return response
}
