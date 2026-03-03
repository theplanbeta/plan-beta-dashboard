import { randomBytes, randomInt, createHash } from 'crypto'

/**
 * Generate a secure random password
 * Format: 12 characters with uppercase, lowercase, numbers, and special characters
 * Uses crypto.randomInt() for cryptographically secure randomness
 */
export function generateSecurePassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*'
  const allChars = uppercase + lowercase + numbers + special

  // Ensure at least one of each type
  let password = ''
  password += uppercase[randomInt(uppercase.length)]
  password += lowercase[randomInt(lowercase.length)]
  password += numbers[randomInt(numbers.length)]
  password += special[randomInt(special.length)]

  // Fill remaining 8 characters randomly
  for (let i = 0; i < 8; i++) {
    password += allChars[randomInt(allChars.length)]
  }

  // Fisher-Yates shuffle with crypto randomness
  const arr = password.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.join('')
}

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export function validatePasswordStrength(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Generate a secure password reset token
 * Returns a 32-character hexadecimal string
 */
export function generateResetToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Hash a token with SHA-256 for safe storage in the database.
 * The raw token is sent to the user (via email link); only the hash is stored.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Check if a reset token has expired
 * @param expiry - The token expiry date
 * @returns true if expired, false otherwise
 */
export function isTokenExpired(expiry: Date): boolean {
  return new Date() > expiry
}

/**
 * Get token expiry time (1 hour from now)
 */
export function getTokenExpiry(): Date {
  const expiry = new Date()
  expiry.setHours(expiry.getHours() + 1)
  return expiry
}
