"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface AtRiskStudent {
  id: string
  name: string
  studentId: string
  churnRisk: string
  attendanceRate: number
  consecutiveAbsences: number
  paymentStatus: string
  batch: { batchCode: string } | null
  whatsapp: string
}

export default function RetentionDashboard() {
  const [students, setStudents] = useState<AtRiskStudent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/students?completionStatus=ACTIVE&churnRisk=HIGH,MEDIUM&limit=50")
      .then((res) => (res.ok ? res.json() : { students: [] }))
      .then((data) => {
        // The students API may return different shapes; normalize
        const list = data.students || data || []
        setStudents(
          list
            .filter((s: AtRiskStudent) => s.churnRisk === "HIGH" || s.churnRisk === "MEDIUM")
            .sort((a: AtRiskStudent, b: AtRiskStudent) => {
              if (a.churnRisk === "HIGH" && b.churnRisk !== "HIGH") return -1
              if (a.churnRisk !== "HIGH" && b.churnRisk === "HIGH") return 1
              return a.consecutiveAbsences > b.consecutiveAbsences ? -1 : 1
            })
        )
      })
      .catch(() => setStudents([]))
      .finally(() => setLoading(false))
  }, [])

  const highCount = students.filter((s) => s.churnRisk === "HIGH").length
  const mediumCount = students.filter((s) => s.churnRisk === "MEDIUM").length

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Student Retention</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Student Retention</h3>
        <div className="flex gap-3 text-sm">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
            {highCount} High
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full" />
            {mediumCount} Medium
          </span>
        </div>
      </div>

      {students.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
          No at-risk students. Great job!
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Student</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Batch</th>
                <th className="text-center py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Risk</th>
                <th className="text-center py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Attendance</th>
                <th className="text-center py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Absences</th>
                <th className="text-center py-2 font-medium text-gray-500 dark:text-gray-400">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {students.slice(0, 10).map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-2.5 pr-4">
                    <Link
                      href={`/dashboard/students/${student.id}`}
                      className="font-medium text-gray-900 dark:text-white hover:text-primary"
                    >
                      {student.name}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400">
                    {student.batch?.batchCode || "-"}
                  </td>
                  <td className="py-2.5 pr-4 text-center">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        student.churnRisk === "HIGH"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}
                    >
                      {student.churnRisk}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-center text-gray-600 dark:text-gray-400">
                    {Number(student.attendanceRate).toFixed(0)}%
                  </td>
                  <td className="py-2.5 pr-4 text-center">
                    <span className={student.consecutiveAbsences >= 3 ? "text-red-600 font-semibold" : "text-gray-600 dark:text-gray-400"}>
                      {student.consecutiveAbsences}
                    </span>
                  </td>
                  <td className="py-2.5 text-center">
                    <span
                      className={`text-xs ${
                        student.paymentStatus === "COMPLETED"
                          ? "text-green-600"
                          : student.paymentStatus === "OVERDUE"
                            ? "text-red-600"
                            : "text-yellow-600"
                      }`}
                    >
                      {student.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {students.length > 10 && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              Showing 10 of {students.length} at-risk students
            </p>
          )}
        </div>
      )}
    </div>
  )
}
