import { NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"
import { assignReferralCode } from "@/lib/referral-codes"

// POST /api/students/referral-code — Backfill referral codes for existing students
export async function POST() {
  try {
    const check = await checkPermission("students", "update")
    if (!check.authorized) return check.response

    // Only process FOUNDER role
    if (check.session?.user?.role !== "FOUNDER") {
      return NextResponse.json({ error: "FOUNDER access required" }, { status: 403 })
    }

    const students = await prisma.student.findMany({
      where: { referralCode: null, completionStatus: { in: ["ACTIVE", "COMPLETED"] } },
      select: { id: true, name: true },
    })

    let assigned = 0
    let failed = 0

    for (const student of students) {
      const code = await assignReferralCode(student.id, student.name)
      if (code) {
        assigned++
      } else {
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      total: students.length,
      assigned,
      failed,
    })
  } catch (error) {
    console.error("Referral code backfill error:", error)
    return NextResponse.json(
      { error: "Failed to backfill referral codes" },
      { status: 500 }
    )
  }
}
