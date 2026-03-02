import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/api-permissions"
import { EXCHANGE_RATE } from "@/lib/pricing"

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

// GET /api/analytics/teacher-performance - Teacher performance analysis (FOUNDER only)
export async function GET() {
  try {
    const check = await checkPermission("analytics", "read")
    if (!check.authorized) return check.response

    // Fetch all teachers with their batches, teacher hours, and batch students
    const teachers = await prisma.user.findMany({
      where: { role: "TEACHER" },
      select: {
        id: true,
        name: true,
        email: true,
        batches: {
          select: {
            id: true,
            students: {
              select: {
                id: true,
                attendanceRate: true,
                completionStatus: true,
              },
            },
          },
        },
        teacherHours: {
          where: { status: "APPROVED" },
          select: {
            hoursWorked: true,
            totalAmount: true,
          },
        },
      },
    })

    let summaryTotalHours = 0
    let summaryTotalCostINR = 0
    let summaryAttendanceSum = 0
    let summaryAttendanceCount = 0

    const teacherPerformance = teachers.map((teacher) => {
      // Total approved hours worked
      const totalHours = teacher.teacherHours.reduce(
        (sum, h) => sum + Number(h.hoursWorked),
        0
      )

      // Total cost in INR (teacher payments are in INR)
      const totalCostINR = teacher.teacherHours.reduce(
        (sum, h) => sum + Number(h.totalAmount),
        0
      )

      // Convert to EUR
      const totalCostEUR = totalCostINR / EXCHANGE_RATE

      // Number of batches assigned
      const batchCount = teacher.batches.length

      // Collect all students across teacher's batches
      const allStudents = teacher.batches.flatMap((b) => b.students)
      const studentCount = allStudents.length

      // Average attendance rate across all students in teacher's batches
      let avgAttendanceRate = 0
      if (allStudents.length > 0) {
        const attendanceSum = allStudents.reduce(
          (sum, s) => sum + Number(s.attendanceRate),
          0
        )
        avgAttendanceRate = attendanceSum / allStudents.length
      }

      // Churn rate: students DROPPED / total students
      const droppedCount = allStudents.filter(
        (s) => s.completionStatus === "DROPPED"
      ).length
      const churnRate = studentCount > 0
        ? (droppedCount / studentCount) * 100
        : 0

      // Cost per student (EUR)
      const costPerStudent = studentCount > 0
        ? totalCostEUR / studentCount
        : 0

      // Cost per hour (INR, since teacher costs are in INR)
      const costPerHour = totalHours > 0
        ? totalCostINR / totalHours
        : 0

      // Accumulate summary values
      summaryTotalHours += totalHours
      summaryTotalCostINR += totalCostINR
      if (allStudents.length > 0) {
        summaryAttendanceSum += avgAttendanceRate * allStudents.length
        summaryAttendanceCount += allStudents.length
      }

      return {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        totalHours: round2(totalHours),
        totalCostINR: round2(totalCostINR),
        totalCostEUR: round2(totalCostEUR),
        batchCount,
        studentCount,
        avgAttendanceRate: round2(avgAttendanceRate),
        churnRate: round2(churnRate),
        costPerStudent: round2(costPerStudent),
        costPerHour: round2(costPerHour),
      }
    })

    // Build summary
    const totalTeachers = teachers.length
    const roundedTotalHours = round2(summaryTotalHours)
    const roundedTotalCostINR = round2(summaryTotalCostINR)
    const roundedTotalCostEUR = round2(summaryTotalCostINR / EXCHANGE_RATE)
    const avgCostPerHour = summaryTotalHours > 0
      ? round2(summaryTotalCostINR / summaryTotalHours)
      : 0
    const avgAttendanceRate = summaryAttendanceCount > 0
      ? round2(summaryAttendanceSum / summaryAttendanceCount)
      : 0

    return NextResponse.json({
      teachers: teacherPerformance,
      summary: {
        totalTeachers,
        totalHours: roundedTotalHours,
        totalCostINR: roundedTotalCostINR,
        totalCostEUR: roundedTotalCostEUR,
        avgCostPerHour,
        avgAttendanceRate,
      },
    })
  } catch (error) {
    console.error("Error calculating teacher performance:", error)
    return NextResponse.json(
      { error: "Failed to calculate teacher performance" },
      { status: 500 }
    )
  }
}
