export interface ShareContent {
  text: string
  url: string
}

export function buildWhatsAppShareUrl({ text, url }: ShareContent): string {
  const message = `${text}\n\n${url}`
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

export function appendUtm(
  url: string,
  params: { source: string; medium: string; campaign: string; code?: string }
): string {
  const u = new URL(url)
  u.searchParams.set("utm_source", params.source)
  u.searchParams.set("utm_medium", params.medium)
  u.searchParams.set("utm_campaign", params.campaign)
  if (params.code) u.searchParams.set("ref", params.code)
  return u.toString()
}

/**
 * Prefer the native Web Share API when available; fall back to WhatsApp
 * (opens wa.me with a pre-filled message in a new tab). Returns "shared"
 * if a native share was accepted/cancelled (user interacted) and "fallback"
 * if we routed to WhatsApp.
 */
export async function shareOrFallback(content: ShareContent): Promise<"shared" | "fallback"> {
  if (typeof navigator !== "undefined" && typeof (navigator as Navigator & { share?: unknown }).share === "function") {
    try {
      await (navigator as Navigator & {
        share: (d: ShareContent) => Promise<void>
      }).share({ text: content.text, url: content.url })
      return "shared"
    } catch (err) {
      // User cancelled — treat as shared (don't also open WhatsApp).
      if ((err as Error).name === "AbortError") return "shared"
      // Real error: fall through to WhatsApp.
    }
  }
  if (typeof window !== "undefined") {
    window.open(buildWhatsAppShareUrl(content), "_blank", "noopener")
  }
  return "fallback"
}
