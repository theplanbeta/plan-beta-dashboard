/**
 * Native Bridge — abstraction layer for PWA and Capacitor
 *
 * All functions work in both browser (PWA) and Capacitor (native app).
 * When running inside Capacitor, native plugins are used for better UX.
 * When running in browser, standard Web APIs are used as fallback.
 */

/**
 * Check if running inside a Capacitor native app
 */
export function isNativeApp(): boolean {
  return typeof window !== "undefined" && !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
}

/**
 * Get the current platform
 */
export function getPlatform(): "ios" | "android" | "web" {
  if (!isNativeApp()) return "web"
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor
  const platform = cap?.getPlatform?.()
  if (platform === "ios") return "ios"
  if (platform === "android") return "android"
  return "web"
}

/**
 * Get current GPS location
 * PWA: navigator.geolocation
 * Capacitor: @capacitor/geolocation (when available)
 */
export async function getLocation(): Promise<{ lat: number; lon: number } | null> {
  try {
    if (isNativeApp()) {
      // Dynamic import for Capacitor plugin (installed when building native apps)
      // @ts-expect-error — @capacitor/geolocation installed only in native builds
      const { Geolocation } = await import("@capacitor/geolocation")
      const pos = await Geolocation.getCurrentPosition()
      return { lat: pos.coords.latitude, lon: pos.coords.longitude }
    }

    // Browser fallback
    if (!("geolocation" in navigator)) return null

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 10000, enableHighAccuracy: false }
      )
    })
  } catch {
    return null
  }
}

/**
 * Share content using native share sheet
 * PWA: Web Share API
 * Capacitor: @capacitor/share
 */
export async function shareContent(data: {
  title?: string
  text?: string
  url?: string
}): Promise<boolean> {
  try {
    if (isNativeApp()) {
      // @ts-expect-error — @capacitor/share installed only in native builds
      const { Share } = await import("@capacitor/share")
      await Share.share({
        title: data.title,
        text: data.text,
        url: data.url,
        dialogTitle: "Share Job",
      })
      return true
    }

    // Browser fallback
    if (navigator.share) {
      await navigator.share(data)
      return true
    }

    // Final fallback: copy to clipboard
    if (data.url && navigator.clipboard) {
      await navigator.clipboard.writeText(data.url)
      return true
    }

    return false
  } catch {
    return false
  }
}

/**
 * Check if a capability is available
 */
export function hasCapability(capability: "camera" | "geolocation" | "share" | "push"): boolean {
  if (typeof window === "undefined") return false

  switch (capability) {
    case "camera":
      return true // File input always works, native camera always available
    case "geolocation":
      return "geolocation" in navigator || isNativeApp()
    case "share":
      return !!navigator.share || isNativeApp()
    case "push":
      return "serviceWorker" in navigator && "PushManager" in window
    default:
      return false
  }
}
