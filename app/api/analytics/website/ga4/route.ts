import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { getCachedOrFetch } from "@/lib/analytics/cache"
import { fetchAllGA4Data } from "@/lib/analytics/ga4"

export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("analytics", "read")
    if (!check.authorized) return check.response

    const period = parseInt(request.nextUrl.searchParams.get("period") || "30")

    const data = await getCachedOrFetch("ga4", `${period}d`, 240, () => fetchAllGA4Data(period))

    if (!data) {
      return NextResponse.json({ configured: false, message: "GA4 not configured" })
    }

    return NextResponse.json({ configured: true, ...data })
  } catch (error) {
    console.error("GA4 analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch GA4 data" }, { status: 500 })
  }
}
