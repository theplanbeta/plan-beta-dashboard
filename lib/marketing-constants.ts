// Single source of truth for headline numbers + contact info shown across
// the marketing site. Numbers in this file are public claims — update them
// here when reality changes and the change propagates everywhere.

export const MARKETING_WHATSAPP_NUMBER = "919028396035"

export function marketingWhatsAppUrl(message: string): string {
  return `https://wa.me/${MARKETING_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

// Social-proof claims. Keep the `asOf` ISO date current — it's what makes
// the number trustworthy if anyone digs.
export const SOCIAL_PROOF = {
  nursesPlaced: 17,
  nursesPlacedAsOf: "2026-04-19",
  whatsAppReplyHours: 2,
  // Live count of students is read from the DB at runtime where possible.
  // The static fallback below is the floor (current minimum we're willing to
  // claim) and only shows if the live count query fails.
  studentsFallback: 500,
} as const
