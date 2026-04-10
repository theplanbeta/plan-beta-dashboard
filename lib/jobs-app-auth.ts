/**
 * Jobs App Auth — JWT + bcrypt authentication for the JobSeeker model.
 * Evolves the pattern from lib/jobs-portal-auth.ts (jose JWTs) with
 * full account support: password hashing, session tokens, magic links,
 * and request-level auth helpers.
 */

import { SignJWT, jwtVerify } from "jose"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"
import { JobSeeker, JobSeekerProfile } from "@prisma/client"

// ---------------------------------------------------------------------------
// Secret
// ---------------------------------------------------------------------------

const SECRET_RAW = process.env.JOB_PORTAL_SECRET || process.env.NEXTAUTH_SECRET || ""

function getSecretKey(): Uint8Array {
  if (!SECRET_RAW) throw new Error("JOB_PORTAL_SECRET not configured")
  return new TextEncoder().encode(SECRET_RAW)
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface JobsAppTokenPayload {
  seekerId: string
  email: string
  tier: string
}

export type JobSeekerWithProfile = JobSeeker & {
  profile: JobSeekerProfile | null
}

// ---------------------------------------------------------------------------
// Password helpers
// ---------------------------------------------------------------------------

/**
 * Hash a plain-text password with bcrypt (12 rounds).
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/**
 * Compare a plain-text password against a bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ---------------------------------------------------------------------------
// Session token (30 days)
// ---------------------------------------------------------------------------

/**
 * Sign a session JWT for an authenticated JobSeeker.
 */
export async function signJobsAppToken(
  seekerId: string,
  email: string,
  tier: string
): Promise<string> {
  return new SignJWT({ seekerId, email, tier } satisfies JobsAppTokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretKey())
}

/**
 * Verify a session JWT and return its payload, or null on failure.
 */
export async function verifyJobsAppToken(token: string): Promise<JobsAppTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    return {
      seekerId: payload.seekerId as string,
      email: payload.email as string,
      tier: (payload.tier as string) || "FREE",
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Magic-link token (1 hour)
// ---------------------------------------------------------------------------

const MAGIC_LINK_PURPOSE = "jobs-app-magic-link"

/**
 * Sign a one-time magic-link JWT (expires in 1 hour).
 */
export async function signMagicLinkToken(email: string): Promise<string> {
  return new SignJWT({ email, purpose: MAGIC_LINK_PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(getSecretKey())
}

/**
 * Verify a magic-link JWT and return the email, or null on failure.
 * Also guards against cross-purpose token reuse via the `purpose` field.
 */
export async function verifyMagicLinkToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    if (payload.purpose !== MAGIC_LINK_PURPOSE) return null
    return payload.email as string
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Request-level auth helpers
// ---------------------------------------------------------------------------

/**
 * Extract a bearer token from an incoming Request.
 * Checks the Authorization header first, then the `pb-jobs-app` cookie.
 */
function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization")
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7)
  }

  const cookieHeader = request.headers.get("cookie")
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)pb-jobs-app=([^;]+)/)
    if (match) return decodeURIComponent(match[1])
  }

  return null
}

/**
 * Authenticate the request and return the full JobSeeker (with profile),
 * or null if unauthenticated / token invalid.
 */
export async function getJobSeeker(request: Request): Promise<JobSeekerWithProfile | null> {
  const token = extractToken(request)
  if (!token) return null

  const payload = await verifyJobsAppToken(token)
  if (!payload) return null

  try {
    const seeker = await prisma.jobSeeker.findUnique({
      where: { id: payload.seekerId },
      include: { profile: true },
    })
    return seeker as JobSeekerWithProfile | null
  } catch {
    return null
  }
}

/**
 * Like getJobSeeker, but throws a 401 Response if unauthenticated.
 * Use in API routes that require a logged-in JobSeeker.
 */
export async function requireJobSeeker(request: Request): Promise<JobSeekerWithProfile> {
  const seeker = await getJobSeeker(request)
  if (!seeker) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }
  return seeker
}

// ---------------------------------------------------------------------------
// Tier helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the JobSeeker has premium access.
 * Premium is granted when tier === PREMIUM **or** when the seeker is linked
 * to a Plan Beta student (planBetaStudentId is set).
 */
export function isPremium(seeker: JobSeeker): boolean {
  return seeker.tier === "PREMIUM" || Boolean(seeker.planBetaStudentId)
}
