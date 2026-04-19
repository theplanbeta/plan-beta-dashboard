import { randomBytes } from "crypto"

const RESERVED = new Set(["admin", "founder", "test", "demo", "support", "dayzero", "dz"])

function shortToken(): string {
  return randomBytes(4).toString("hex").toUpperCase().slice(0, 4)
}

/**
 * Generate a friendly referral code from the user's name.
 * Pattern: "{FIRSTNAME}-D0-{4HEX}" → "PRIYA-D0-A3F2".
 * Falls back to "DZ" when no name is provided or sanitization strips it.
 */
export function generateReferralCode(name: string | null | undefined): string {
  const firstToken = (name ?? "").trim().split(/\s+/)[0] ?? ""
  const cleaned = firstToken.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)
  const base = cleaned && !RESERVED.has(cleaned.toLowerCase()) ? cleaned : "DZ"
  return `${base}-D0-${shortToken()}`
}
