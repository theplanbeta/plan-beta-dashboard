import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { fetchAllFirstPartyData } from "@/lib/analytics/first-party"

export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("analytics", "read")
    if (!check.authorized) return check.response

    const period = parseInt(request.nextUrl.searchParams.get("period") || "30")

    const data = await fetchAllFirstPartyData(period)

    return NextResponse.json({ configured: true, ...data })
  } catch (error) {
    console.error("First-party analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch first-party data" }, { status: 500 })
  }
}
