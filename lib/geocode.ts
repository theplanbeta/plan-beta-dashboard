/**
 * Reverse geocoding using Nominatim (OpenStreetMap)
 * Free, no API key needed, 1 request/second rate limit
 */

interface NominatimResponse {
  address?: {
    city?: string
    town?: string
    village?: string
    municipality?: string
    county?: string
    state?: string
    country?: string
    country_code?: string
  }
  display_name?: string
}

/**
 * Convert GPS coordinates to a city/town name
 * Returns city name or null if geocoding fails
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`

    const response = await fetch(url, {
      headers: {
        "User-Agent": "PlanBeta-SpotAJob/1.0 (contact@planbeta.in)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return null

    const data: NominatimResponse = await response.json()

    if (!data.address) return null

    // Try city first, then town, village, municipality
    const cityName =
      data.address.city ||
      data.address.town ||
      data.address.village ||
      data.address.municipality ||
      data.address.county

    if (!cityName) return null

    // Append state/country for context
    const parts = [cityName]
    if (data.address.state) parts.push(data.address.state)
    if (data.address.country_code && data.address.country_code !== "de") {
      parts.push(data.address.country || "")
    }

    return parts.filter(Boolean).join(", ")
  } catch (error) {
    console.warn("[Geocode] Reverse geocoding failed:", error)
    return null
  }
}
