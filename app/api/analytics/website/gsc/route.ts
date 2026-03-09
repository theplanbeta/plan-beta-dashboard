import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { getCachedOrFetch } from "@/lib/analytics/cache"
import { fetchAllGSCData } from "@/lib/analytics/gsc"

export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("analytics", "read")
    if (!check.authorized) return check.response

    const period = parseInt(request.nextUrl.searchParams.get("period") || "30")

    const data = await getCachedOrFetch("gsc", `${period}d`, 240, () => fetchAllGSCData(period))

    if (!data) {
      return NextResponse.json({ configured: false, message: "Google Search Console not configured" })
    }

    return NextResponse.json({ configured: true, ...data })
  } catch (error) {
    console.error("GSC analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch GSC data" }, { status: 500 })
  }
}
