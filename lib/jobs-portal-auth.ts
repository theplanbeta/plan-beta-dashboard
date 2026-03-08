/**
 * Jobs Portal Auth — JWT-based premium authentication
 * Uses JobSubscription.email as identity, no user accounts needed.
 */

import { SignJWT, jwtVerify } from "jose"

const SECRET_KEY = process.env.JOB_PORTAL_SECRET || process.env.NEXTAUTH_SECRET || ""

function getSecretKey() {
  if (!SECRET_KEY) throw new Error("JOB_PORTAL_SECRET not configured")
  return new TextEncoder().encode(SECRET_KEY)
}

export interface PortalTokenPayload {
  email: string
  tier: string
}

/**
 * Sign a JWT for a premium subscriber
 */
export async function signPortalToken(email: string, tier = "premium"): Promise<string> {
  return new SignJWT({ email, tier })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretKey())
}

/**
 * Verify a portal JWT and return payload
 */
export async function verifyPortalToken(token: string): Promise<PortalTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    return {
      email: payload.email as string,
      tier: (payload.tier as string) || "premium",
    }
  } catch {
    return null
  }
}

/**
 * Sign a magic link token (shorter expiry)
 */
export async function signMagicLinkToken(email: string): Promise<string> {
  return new SignJWT({ email, purpose: "magic-link" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(getSecretKey())
}

/**
 * Verify a magic link token
 */
export async function verifyMagicLinkToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    if (payload.purpose !== "magic-link") return null
    return payload.email as string
  } catch {
    return null
  }
}
