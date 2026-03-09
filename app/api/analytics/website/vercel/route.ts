import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { getCachedOrFetch } from "@/lib/analytics/cache"
import { fetchAllVercelData } from "@/lib/analytics/vercel-analytics"

export async function GET(request: NextRequest) {
  try {
    const check = await checkPermission("analytics", "read")
    if (!check.authorized) return check.response

    const period = parseInt(request.nextUrl.searchParams.get("period") || "30")

    const data = await getCachedOrFetch("vercel_web", `${period}d`, 60, () => fetchAllVercelData(period))

    if (!data) {
      return NextResponse.json({ configured: false, message: "Vercel Analytics not configured" })
    }

    return NextResponse.json({ configured: true, ...data })
  } catch (error) {
    console.error("Vercel analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch Vercel analytics data" }, { status: 500 })
  }
}
