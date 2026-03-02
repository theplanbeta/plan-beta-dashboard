import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"

// DELETE /api/utm-links/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const check = await checkPermission("utmLinks", "delete")
    if (!check.authorized) return check.response

    const { id } = await params

    await prisma.utmLink.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting UTM link:", error)
    return NextResponse.json({ error: "Failed to delete link" }, { status: 500 })
  }
}
