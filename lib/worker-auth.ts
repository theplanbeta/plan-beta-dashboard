import { createHmac, timingSafeEqual } from "crypto"

const SECRET = process.env.CRON_SECRET

export function signWorkerPayload(payload: string): string {
  if (!SECRET) throw new Error("CRON_SECRET is not configured")
  return createHmac("sha256", SECRET).update(payload).digest("hex")
}

export function verifyWorkerSignature(payload: string, signature: string): boolean {
  if (!SECRET) return false
  try {
    const expected = signWorkerPayload(payload)
    const a = Buffer.from(expected, "hex")
    const b = Buffer.from(signature, "hex")
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
