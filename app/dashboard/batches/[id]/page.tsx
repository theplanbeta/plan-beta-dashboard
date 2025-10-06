"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatCurrency, formatDate } from "@/lib/utils"

type Batch = {
  id: string
  batchCode: string
  level: string
  totalSeats: number
  enrolledCount: number
  fillRate: number
  revenueTarget: number
  revenueActual: number
  teacherCost: number
  profit: number
  startDate: string | null
  endDate: string | null
  schedule: string | null
  status: string
  notes: string | null
  teacher: {
    id: string
    name: string
    email: string
  } | null
  students: Array<{
    id: string
    studentId: string
    name: string
    whatsapp: string
    currentLevel: string
    paymentStatus: string
    finalPrice: number
    totalPaid: number
    balance: number
    classesAttended: number
    totalClasses: number
    attendanceRate: number
  }>
}

export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [batch, setBatch] = useState<Batch | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchBatch()
  }, [id])

  const fetchBatch = async () => {
    try {
      const res = await fetch(`/api/batches/${id}`)
      if (!res.ok) throw new Error("Failed to fetch batch")

      const data = await res.json()
      setBatch(data)
    } catch (error) {
      console.error("Error fetching batch:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this batch? This action cannot be undone.")) {
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/batches/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to delete batch")
      }

      router.push("/dashboard/batches")
      router.refresh()
    } catch (error: unknown) {
      console.error("Error deleting batch:", error)
      alert(error instanceof Error ? error.message : "Failed to delete batch")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading batch...</div>
      </div>
    )
  }

  if (!batch) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-error">Batch not found</div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      PLANNING: "bg-gray-100 text-gray-800",
      FILLING: "bg-warning/10 text-warning",
      FULL: "bg-success/10 text-success",
      RUNNING: "bg-info/10 text-info",
      COMPLETED: "bg-gray-100 text-gray-600",
      POSTPONED: "bg-warning/10 text-warning",
      CANCELLED: "bg-error/10 text-error",
      PAID: "bg-success/10 text-success",
      PENDING: "bg-warning/10 text-warning",
      PARTIAL: "bg-info/10 text-info",
      OVERDUE: "bg-error/10 text-error",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const getFillRateColor = (rate: number) => {
    if (rate >= 80) return "text-success"
    if (rate >= 50) return "text-warning"
    return "text-error"
  }

  const profitMargin = batch.revenueActual > 0
    ? ((batch.profit / batch.revenueActual) * 100).toFixed(1)
    : "0"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold text-foreground">{batch.batchCode}</h1>
            <span className={`px-3 py-1 rounded-full text-sm ${getStatusBadge(batch.status)}`}>
              {batch.status}
            </span>
          </div>
          <p className="mt-2 text-gray-600">Level {batch.level}</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href={`/dashboard/batches/${batch.id}/edit`}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
          >
            Edit Batch
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 border border-error text-error rounded-md hover:bg-error hover:text-white disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
          <Link
            href="/dashboard/batches"
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back
          </Link>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Fill Rate</div>
          <div className={`text-2xl font-bold mt-1 ${getFillRateColor(batch.fillRate)}`}>
            {batch.fillRate.toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {batch.enrolledCount} / {batch.totalSeats} seats
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Revenue</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {formatCurrency(Number(batch.revenueActual))}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Target: {formatCurrency(Number(batch.revenueTarget))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Profit</div>
          <div className={`text-2xl font-bold mt-1 ${batch.profit >= 0 ? "text-success" : "text-error"}`}>
            {formatCurrency(Number(batch.profit))}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Margin: {profitMargin}%
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Teacher Cost</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {formatCurrency(Number(batch.teacherCost))}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {batch.teacher?.name || "Not assigned"}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Roster */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Student Roster</h2>
              <Link
                href={`/dashboard/students/new?batchId=${batch.id}`}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark text-sm"
              >
                + Add Student
              </Link>
            </div>

            {batch.students.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No students enrolled yet. Click &quot;Add Student&quot; to enroll.
              </div>
            ) : (
              <div className="space-y-3">
                {batch.students.map((student) => (
                  <Link
                    key={student.id}
                    href={`/dashboard/students/${student.id}`}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <div className="font-medium text-foreground">{student.name}</div>
                          <div className="text-sm text-gray-600">{student.studentId}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-2 text-sm">
                        <span className="text-gray-600">
                          Level: <span className="font-medium">{student.currentLevel}</span>
                        </span>
                        <span className="text-gray-600">
                          Attendance: <span className="font-medium">{student.attendanceRate.toFixed(0)}%</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(student.paymentStatus)}`}>
                        {student.paymentStatus}
                      </span>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {formatCurrency(Number(student.totalPaid))}
                        </div>
                        <div className="text-xs text-gray-500">
                          of {formatCurrency(Number(student.finalPrice))}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Batch Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-foreground mb-4">Batch Information</h3>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Teacher</div>
                <div className="font-medium">
                  {batch.teacher ? (
                    <Link
                      href={`/dashboard/teachers/${batch.teacher.id}`}
                      className="text-primary hover:underline"
                    >
                      {batch.teacher.name}
                    </Link>
                  ) : (
                    <span className="text-gray-500">Not assigned</span>
                  )}
                </div>
              </div>

              {batch.schedule && (
                <div>
                  <div className="text-sm text-gray-600">Schedule</div>
                  <div className="font-medium">{batch.schedule}</div>
                </div>
              )}

              {batch.startDate && (
                <div>
                  <div className="text-sm text-gray-600">Start Date</div>
                  <div className="font-medium">{formatDate(batch.startDate)}</div>
                </div>
              )}

              {batch.endDate && (
                <div>
                  <div className="text-sm text-gray-600">End Date</div>
                  <div className="font-medium">{formatDate(batch.endDate)}</div>
                </div>
              )}

              {batch.notes && (
                <div className="pt-3 border-t">
                  <div className="text-sm text-gray-600 mb-1">Notes</div>
                  <div className="text-sm">{batch.notes}</div>
                </div>
              )}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-foreground mb-4">Financial Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Revenue Target</span>
                <span className="font-medium">{formatCurrency(Number(batch.revenueTarget))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Revenue Actual</span>
                <span className="font-medium text-success">
                  {formatCurrency(Number(batch.revenueActual))}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="text-gray-600">Teacher Cost</span>
                <span className="font-medium text-error">
                  {formatCurrency(Number(batch.teacherCost))}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="font-semibold">Net Profit</span>
                <span className={`font-semibold ${batch.profit >= 0 ? "text-success" : "text-error"}`}>
                  {formatCurrency(Number(batch.profit))}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Profit Margin</span>
                <span className="font-medium">{profitMargin}%</span>
              </div>
            </div>
          </div>

          {/* Capacity Progress */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-foreground mb-4">Capacity</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Enrolled</span>
                <span className={`font-semibold ${getFillRateColor(batch.fillRate)}`}>
                  {batch.enrolledCount} / {batch.totalSeats}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    batch.fillRate >= 80
                      ? "bg-success"
                      : batch.fillRate >= 50
                      ? "bg-warning"
                      : "bg-error"
                  }`}
                  style={{ width: `${Math.min(batch.fillRate, 100)}%` }}
                />
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getFillRateColor(batch.fillRate)}`}>
                  {batch.fillRate.toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500">Fill Rate</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
