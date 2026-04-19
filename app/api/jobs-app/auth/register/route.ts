import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { hashPassword, signJobsAppToken } from "@/lib/jobs-app-auth"
import { authRegisterLimiter, extractIp } from "@/lib/rate-limit-upstash"
import { generateReferralCode } from "@/lib/referral-code"
import { trackServerLead } from "@/lib/meta-capi"
import { sendTemplate } from "@/lib/whatsapp"

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  whatsapp: z.string().trim().min(5).max(20).optional(),
  referralCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{6,30}$/, "Invalid referral code")
    .optional(),
})

export async function POST(request: Request) {
  // Rate-limit registration (Upstash-backed so cold-start bypass is closed).
  const ip = extractIp(request)
  const rl = await authRegisterLimiter.limit(ip).catch(() => ({
    success: false,
    reset: Date.now() + 60_000,
  }))
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many registration attempts. Try again in a minute." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(((rl as { reset: number }).reset - Date.now()) / 1000)) } }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const { email, password, name, whatsapp, referralCode: referrerCode } = parsed.data
  const normalizedEmail = email.toLowerCase()

  const existing = await prisma.jobSeeker.findUnique({
    where: { email: normalizedEmail },
  })
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    )
  }

  const passwordHash = await hashPassword(password)

  // Generate a unique referral code for this seeker (up to 5 tries, then fallback).
  let referralCode = generateReferralCode(name)
  for (let i = 0; i < 5; i++) {
    const collision = await prisma.jobSeeker.findUnique({
      where: { referralCode },
      select: { id: true },
    })
    if (!collision) break
    referralCode = generateReferralCode(name)
  }

  // Validate the referrer code — only store if it actually exists.
  let referredBy: string | null = null
  let referredAt: Date | null = null
  if (referrerCode) {
    const referrer = await prisma.jobSeeker.findUnique({
      where: { referralCode: referrerCode },
      select: { id: true },
    })
    if (referrer) {
      referredBy = referrerCode
      referredAt = new Date()
    }
  }

  const seeker = await prisma.jobSeeker.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name,
      whatsapp: whatsapp ?? null,
      referralCode,
      referredBy,
      referredAt,
    },
  })

  // Fire-and-forget growth events — never block registration on these.
  // trackServerLead fires a "Lead" Meta CAPI event (the generator's fixed
  // event_name). Meta treats this as our activation signal.
  trackServerLead({
    email: normalizedEmail,
    phone: whatsapp ?? null,
    name,
    sourceUrl: request.headers.get("referer") ?? "https://dayzero.xyz/jobs-app/auth",
  }).catch((err) => console.warn("CAPI Lead failed", { err: (err as Error).message }))

  if (whatsapp) {
    // Template `job_portal_welcome` must be approved in Meta Business Manager
    // with one {{1}} body parameter. If it's not yet approved the call will
    // log + no-op (template errors are swallowed by sendTemplate).
    sendTemplate(whatsapp, "job_portal_welcome", [name.split(" ")[0] || "there"]).catch(
      (err) => console.warn("welcome WhatsApp failed", { err: (err as Error).message })
    )
  }

  const token = await signJobsAppToken(seeker.id, seeker.email, seeker.tier)

  // Do NOT return the token in the JSON body. It lives exclusively in the
  // httpOnly cookie — exposing it in the body would let XSS exfiltrate it.
  const response = NextResponse.json(
    {
      seeker: {
        id: seeker.id,
        email: seeker.email,
        name: seeker.name,
        tier: seeker.tier,
      },
    },
    { status: 201 }
  )

  response.cookies.set("pb-jobs-app", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  })

  return response
}
