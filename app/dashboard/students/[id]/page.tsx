"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils"

type Student = {
  id: string
  studentId: string
  name: string
  whatsapp: string
  email: string | null
  enrollmentDate: string
  currentLevel: string
  enrollmentType: string
  originalPrice: number
  discountApplied: number
  finalPrice: number
  paymentStatus: string
  totalPaid: number
  balance: number
  referralSource: string
  trialAttended: boolean
  trialDate: string | null
  classesAttended: number
  totalClasses: number
  attendanceRate: number
  completionStatus: string
  notes: string | null
  createdAt: string
  batch: {
    id: string
    batchCode: string
    level: string
  } | null
  payments: Array<{
    id: string
    amount: number
    paymentDate: string
    method: string
    status: string
  }>
  attendance: Array<{
    id: string
    date: string
    status: string
  }>
}

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchStudent()
  }, [id])

  const fetchStudent = async () => {
    try {
      const res = await fetch(`/api/students/${id}`)
      if (!res.ok) throw new Error("Failed to fetch student")

      const data = await res.json()
      setStudent(data)
    } catch (error) {
      console.error("Error fetching student:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete student")

      router.push("/dashboard/students")
      router.refresh()
    } catch (error) {
      console.error("Error deleting student:", error)
      alert("Failed to delete student")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading student...</div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-error">Student not found</div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      PAID: "bg-success/10 text-success",
      PENDING: "bg-warning/10 text-warning",
      PARTIAL: "bg-info/10 text-info",
      OVERDUE: "bg-error/10 text-error",
      ACTIVE: "bg-success/10 text-success",
      COMPLETED: "bg-info/10 text-info",
      DROPPED: "bg-error/10 text-error",
      ON_HOLD: "bg-warning/10 text-warning",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold text-foreground">{student.name}</h1>
            <span className={`px-3 py-1 rounded-full text-sm ${getStatusBadge(student.completionStatus)}`}>
              {student.completionStatus}
            </span>
          </div>
          <p className="mt-2 text-gray-600">Student ID: {student.studentId}</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href={`/dashboard/students/${student.id}/edit`}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
          >
            Edit Student
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 border border-error text-error rounded-md hover:bg-error hover:text-white disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
          <Link
            href="/dashboard/students"
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Paid</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {formatCurrency(Number(student.totalPaid))}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            of {formatCurrency(Number(student.finalPrice))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Balance</div>
          <div className="text-2xl font-bold text-warning mt-1">
            {formatCurrency(Number(student.balance))}
          </div>
          <div className={`text-xs mt-1 px-2 py-1 rounded inline-block ${getStatusBadge(student.paymentStatus)}`}>
            {student.paymentStatus}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Attendance Rate</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {Number(student.attendanceRate).toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {student.classesAttended} / {student.totalClasses} classes
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Current Level</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {student.currentLevel}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {student.enrollmentType.replace(/_/g, " ")}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">WhatsApp</div>
                <div className="font-medium">{student.whatsapp}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Email</div>
                <div className="font-medium">{student.email || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Enrollment Date</div>
                <div className="font-medium">{formatDate(student.enrollmentDate)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Batch</div>
                <div className="font-medium">{student.batch?.batchCode || "Not Assigned"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Referral Source</div>
                <div className="font-medium">{student.referralSource}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Trial Attended</div>
                <div className="font-medium">
                  {student.trialAttended ? (
                    <span className="text-success">Yes</span>
                  ) : (
                    <span className="text-gray-500">No</span>
                  )}
                  {student.trialDate && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({formatDate(student.trialDate)})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {student.notes && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-gray-600 mb-1">Notes</div>
                <div className="text-sm">{student.notes}</div>
              </div>
            )}
          </div>

          {/* Recent Payments */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Payment History</h2>
            {student.payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No payments recorded yet</div>
            ) : (
              <div className="space-y-3">
                {student.payments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{formatCurrency(Number(payment.amount))}</div>
                      <div className="text-sm text-gray-600">
                        {formatDate(payment.paymentDate)} • {payment.method}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(payment.status)}`}>
                      {payment.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-foreground mb-4">Pricing Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Original Price</span>
                <span className="font-medium">{formatCurrency(Number(student.originalPrice))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discount</span>
                <span className="font-medium text-success">
                  -{formatCurrency(Number(student.discountApplied))}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="font-semibold">Final Price</span>
                <span className="font-semibold">{formatCurrency(Number(student.finalPrice))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Paid</span>
                <span className="font-medium text-success">
                  {formatCurrency(Number(student.totalPaid))}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="font-semibold">Balance</span>
                <span className="font-semibold text-warning">
                  {formatCurrency(Number(student.balance))}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Attendance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-foreground mb-4">Recent Attendance</h3>
            {student.attendance.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">No attendance records</div>
            ) : (
              <div className="space-y-2">
                {student.attendance.slice(0, 10).map((record) => (
                  <div key={record.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{formatDate(record.date)}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        record.status === "PRESENT"
                          ? "bg-success/10 text-success"
                          : record.status === "ABSENT"
                          ? "bg-error/10 text-error"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {record.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
