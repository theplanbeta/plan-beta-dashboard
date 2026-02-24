import { prisma } from "@/lib/prisma"

/**
 * Generate a unique referral code for a student.
 * Format: DEEPAK-PB-7X3K (name prefix + PB + 4-char alphanumeric)
 */
export function generateReferralCode(studentName: string): string {
  const namePrefix = studentName
    .trim()
    .split(/\s+/)[0]
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .substring(0, 8)

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Exclude confusable chars (0/O, 1/I)
  let suffix = ""
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }

  return `${namePrefix}-PB-${suffix}`
}

/**
 * Validate a referral code and return the referrer information.
 */
export async function validateReferralCode(
  code: string
): Promise<{ valid: boolean; referrerId?: string; referrerName?: string }> {
  if (!code || code.length < 5) return { valid: false }

  const student = await prisma.student.findFirst({
    where: { referralCode: code.toUpperCase() },
    select: { id: true, name: true },
  })

  if (!student) return { valid: false }

  return {
    valid: true,
    referrerId: student.id,
    referrerName: student.name,
  }
}

/**
 * Generate and assign a unique referral code to a student.
 * Retries up to 5 times if the code already exists.
 */
export async function assignReferralCode(studentId: string, studentName: string): Promise<string | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode(studentName)
    try {
      await prisma.student.update({
        where: { id: studentId },
        data: { referralCode: code },
      })
      return code
    } catch {
      // Unique constraint violation — retry with new code
      continue
    }
  }
  console.error(`Failed to assign referral code for student ${studentId} after 5 attempts`)
  return null
}
