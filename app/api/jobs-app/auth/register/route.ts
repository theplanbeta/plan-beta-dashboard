import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { hashPassword, signJobsAppToken } from "@/lib/jobs-app-auth"
import { checkRateLimit, getClientIp, RL } from "@/lib/jobs-app-rate-limit"

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
})

export async function POST(request: Request) {
  // Rate-limit registration by IP. 3 sign-ups/hour is enough for real
  // users (sharing a household IP) and well below spam-bot volume.
  const ip = getClientIp(request)
  const ipLimited = checkRateLimit(`register:ip:${ip}`, RL.AUTH_REGISTER)
  if (ipLimited) return ipLimited

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

  const { email, password, name } = parsed.data
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

  const seeker = await prisma.jobSeeker.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name,
    },
  })

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
