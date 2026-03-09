import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { getCachedOrFetch } from "@/lib/analytics/cache"
import { fetchAllGA4Data } from "@/lib/analytics/ga4"
import { BetaAnalyticsDataClient } from "@google-analytics/data"

export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("analytics", "read")
    if (!check.authorized) return check.response

    const period = parseInt(request.nextUrl.searchParams.get("period") || "30")
    const debug = request.nextUrl.searchParams.get("debug") === "1"

    if (debug) {
      // Direct raw GA4 call with full error surfacing
      const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || ""
      let privateKey = keyRaw
      if (privateKey.includes("\\n")) {
        privateKey = privateKey.split("\\n").join("\n")
      }
      const envCheck = {
        hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        hasKey: !!keyRaw,
        hasPropertyId: !!process.env.GA4_PROPERTY_ID,
        keyLength: keyRaw.length,
        keyStart: keyRaw.substring(0, 40),
        keyHasLiteralBackslashN: keyRaw.includes("\\n"),
        keyHasRealNewline: keyRaw.includes("\n"),
        parsedKeyStart: privateKey.substring(0, 40),
      }

      try {
        const client = new BetaAnalyticsDataClient({
          credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: privateKey,
          },
        })
        const [response] = await client.runReport({
          property: `properties/${process.env.GA4_PROPERTY_ID}`,
          dateRanges: [{ startDate: `${period}daysAgo`, endDate: "today" }],
          metrics: [{ name: "sessions" }, { name: "totalUsers" }],
        })
        return NextResponse.json({
          debug: true,
          envCheck,
          success: true,
          sessions: response.rows?.[0]?.metricValues?.[0]?.value,
          users: response.rows?.[0]?.metricValues?.[1]?.value,
        })
      } catch (err) {
        return NextResponse.json({
          debug: true,
          envCheck,
          error: String(err),
        })
      }
    }

    const data = await getCachedOrFetch("ga4", `${period}d`, 240, () => fetchAllGA4Data(period))

    if (!data) {
      return NextResponse.json({ configured: false, message: "GA4 not configured" })
    }

    return NextResponse.json({ configured: true, ...data })
  } catch (error) {
    console.error("GA4 analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch GA4 data", details: String(error) }, { status: 500 })
  }
}
