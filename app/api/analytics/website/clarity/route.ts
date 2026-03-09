import { NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { getClaritySummary } from "@/lib/analytics/clarity"

export async function GET() {
  try {
    const check = await checkPermission("analytics", "read")
    if (!check.authorized) return check.response

    const data = await getClaritySummary()

    return NextResponse.json(data)
  } catch (error) {
    console.error("Clarity analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch Clarity data" }, { status: 500 })
  }
}
