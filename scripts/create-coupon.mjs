#!/usr/bin/env node
/**
 * Create a JobCoupon row.
 *
 * Usage:
 *   node scripts/create-coupon.mjs --code TEST-2026 --duration-days 30 --max-uses 1
 *   node scripts/create-coupon.mjs --duration-days 7 --notes "Investor demo"
 *
 * Flags:
 *   --code <STR>          Code to use; auto-generated if omitted
 *   --duration-days <N>   How many days of Pro the redeemer gets; omit for lifetime
 *   --max-uses <N>        How many seekers can redeem; omit for unlimited
 *   --expires-in-days <N> Coupon validity (when the code stops accepting redemptions)
 *   --notes <STR>         Internal note (not shown to user)
 *   --tier <STR>          PREMIUM (default) — only PREMIUM is meaningful today
 *   --by <STR>            Created-by tag (e.g. your email) for audit
 *
 * Run from the plan-beta-dashboard repo root with .env.local present
 * (i.e. after `vercel env pull .env.local --environment=production`).
 */

import { PrismaClient } from "@prisma/client"
import { randomBytes } from "node:crypto"
import { config as loadEnv } from "dotenv"
import { existsSync } from "node:fs"

if (existsSync(".env.local")) loadEnv({ path: ".env.local" })
else if (existsSync(".env")) loadEnv({ path: ".env" })

const args = parseArgs(process.argv.slice(2))

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith("--")) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith("--")) {
      out[key] = true
    } else {
      out[key] = next
      i++
    }
  }
  return out
}

function genCode() {
  // Human-readable: 6 uppercase alphanumerics, no ambiguous chars (0/O, 1/I).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = randomBytes(6)
  let s = ""
  for (let i = 0; i < 6; i++) s += alphabet[bytes[i] % alphabet.length]
  return `DZ-${s}`
}

const code = (args.code ? String(args.code) : genCode()).toUpperCase().trim()
const durationDays = args["duration-days"] ? parseInt(args["duration-days"], 10) : null
const maxUses = args["max-uses"] ? parseInt(args["max-uses"], 10) : null
const expiresInDays = args["expires-in-days"]
  ? parseInt(args["expires-in-days"], 10)
  : null
const notes = args.notes ? String(args.notes) : null
const tier = (args.tier ? String(args.tier).toUpperCase() : "PREMIUM")
const createdBy = args.by ? String(args.by) : null

if (durationDays !== null && (Number.isNaN(durationDays) || durationDays < 1)) {
  console.error("--duration-days must be a positive integer")
  process.exit(1)
}
if (maxUses !== null && (Number.isNaN(maxUses) || maxUses < 1)) {
  console.error("--max-uses must be a positive integer")
  process.exit(1)
}
if (expiresInDays !== null && (Number.isNaN(expiresInDays) || expiresInDays < 1)) {
  console.error("--expires-in-days must be a positive integer")
  process.exit(1)
}
if (tier !== "PREMIUM" && tier !== "FREE") {
  console.error("--tier must be PREMIUM or FREE")
  process.exit(1)
}

const expiresAt =
  expiresInDays !== null
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null

const prisma = new PrismaClient()

try {
  const existing = await prisma.jobCoupon.findUnique({ where: { code } })
  if (existing) {
    console.error(`Coupon code "${code}" already exists.`)
    process.exit(2)
  }
  const coupon = await prisma.jobCoupon.create({
    data: {
      code,
      tier,
      durationDays,
      maxUses,
      expiresAt,
      notes,
      createdBy,
    },
  })
  console.log("Created coupon:")
  console.log(JSON.stringify(coupon, null, 2))
  console.log(`\nShare this code with the redeemer:  ${code}`)
} finally {
  await prisma.$disconnect()
}
