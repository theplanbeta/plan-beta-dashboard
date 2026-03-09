import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { getCachedOrFetch } from "@/lib/analytics/cache"
import { fetchAllGA4Data, getServiceAccountCredentials } from "@/lib/analytics/ga4"
import { BetaAnalyticsDataClient } from "@google-analytics/data"

export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("analytics", "read")
    if (!check.authorized) return check.response

    const period = parseInt(request.nextUrl.searchParams.get("period") || "30")
    const debug = request.nextUrl.searchParams.get("debug") === "1"

    if (debug) {
      const hasB64 = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64
      const creds = getServiceAccountCredentials()
      const envCheck = {
        hasB64,
        hasEmail: !!creds?.client_email,
        hasKey: !!creds?.private_key,
        hasPropertyId: !!process.env.GA4_PROPERTY_ID,
        keyLength: creds?.private_key?.length || 0,
        keyStart: creds?.private_key?.substring(0, 40) || "",
        email: creds?.client_email || "",
      }

      try {
        const client = new BetaAnalyticsDataClient({ credentials: creds! })
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
