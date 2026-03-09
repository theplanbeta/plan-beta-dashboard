import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { getCachedOrFetch } from "@/lib/analytics/cache"
import { fetchAllGA4Data } from "@/lib/analytics/ga4"

export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("analytics", "read")
    if (!check.authorized) return check.response

    const period = parseInt(request.nextUrl.searchParams.get("period") || "30")

    // Debug: check env vars presence
    const envCheck = {
      hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      hasKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
      hasPropertyId: !!process.env.GA4_PROPERTY_ID,
      keyLength: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.length || 0,
    }
    console.log("[GA4] Env check:", envCheck)

    const data = await getCachedOrFetch("ga4", `${period}d`, 240, () => fetchAllGA4Data(period))

    if (!data) {
      return NextResponse.json({ configured: false, message: "GA4 not configured", envCheck })
    }

    return NextResponse.json({ configured: true, ...data })
  } catch (error) {
    console.error("GA4 analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch GA4 data", details: String(error) }, { status: 500 })
  }
}
