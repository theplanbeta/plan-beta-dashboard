import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { invalidateCache } from "@/lib/analytics/cache"

export async function POST(request: NextRequest) {
  try {
    const check = await checkPermission("analytics", "update")
    if (!check.authorized) return check.response

    const { source } = await request.json()

    if (source && !["ga4", "gsc", "vercel", "clarity", "all"].includes(source)) {
      return NextResponse.json(
        { error: "Invalid source. Must be one of: ga4, gsc, vercel, clarity, all" },
        { status: 400 }
      )
    }

    await invalidateCache(source === "all" ? undefined : source)

    return NextResponse.json({
      success: true,
      message: `Cache invalidated for ${source || "all"} sources`,
    })
  } catch (error) {
    console.error("Cache refresh error:", error)
    return NextResponse.json({ error: "Failed to invalidate cache" }, { status: 500 })
  }
}
