import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { getGA4Realtime } from "@/lib/analytics/ga4"

export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("analytics", "read")
    if (!check.authorized) return check.response

    const data = await getGA4Realtime()

    if (!data) {
      return NextResponse.json({ configured: false, message: "GA4 realtime not configured" })
    }

    return NextResponse.json({ configured: true, ...data })
  } catch (error) {
    console.error("GA4 realtime error:", error)
    return NextResponse.json({ error: "Failed to fetch GA4 realtime data" }, { status: 500 })
  }
}
