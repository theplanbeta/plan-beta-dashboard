import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { verifyPassword, signJobsAppToken } from "@/lib/jobs-app-auth"
import { checkRateLimit, getClientIp, RL } from "@/lib/jobs-app-rate-limit"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const { email, password } = parsed.data
  const normalizedEmail = email.toLowerCase()

  // Rate-limit by both IP and email so a single attacker can't iterate
  // passwords from one IP and can't spray across many IPs against a
  // single known-good email.
  const ip = getClientIp(request)
  const ipLimited = checkRateLimit(`login:ip:${ip}`, RL.AUTH_LOGIN)
  if (ipLimited) return ipLimited
  const emailLimited = checkRateLimit(
    `login:email:${normalizedEmail}`,
    RL.AUTH_LOGIN
  )
  if (emailLimited) return emailLimited

  const seeker = await prisma.jobSeeker.findUnique({
    where: { email: normalizedEmail },
  })

  if (!seeker || !seeker.passwordHash) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
  }

  const valid = await verifyPassword(password, seeker.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
  }

  await prisma.jobSeeker.update({
    where: { id: seeker.id },
    data: { lastLoginAt: new Date() },
  })

  const token = await signJobsAppToken(seeker.id, seeker.email, seeker.tier)

  const response = NextResponse.json({
    token,
    seeker: {
      id: seeker.id,
      email: seeker.email,
      name: seeker.name,
      tier: seeker.tier,
      onboardingComplete: seeker.onboardingComplete,
    },
  })

  response.cookies.set("pb-jobs-app", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  })

  return response
}
