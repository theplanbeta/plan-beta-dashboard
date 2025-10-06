"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"
import { GenerateInvoiceButton } from "@/components/GenerateInvoiceButton"

type Student = {
  id: string
  studentId: string
  name: string
  whatsapp: string
  email: string | null
  currentLevel: string
  enrollmentType: string
  paymentStatus: string
  finalPrice: number
  balance: number
  completionStatus: string
  batch: {
    id: string
    batchCode: string
  } | null
  createdAt: string
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [levelFilter, setLevelFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  useEffect(() => {
    fetchStudents()
  }, [search, levelFilter, statusFilter])

  const fetchStudents = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (levelFilter) params.append("level", levelFilter)
      if (statusFilter) params.append("status", statusFilter)

      const res = await fetch(`/api/students?${params.toString()}`)
      const data = await res.json()

      // Ensure data is an array
      if (Array.isArray(data)) {
        setStudents(data)
      } else {
        console.error("API did not return an array:", data)
        setStudents([])
      }
    } catch (error) {
      console.error("Error fetching students:", error)
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      PAID: "bg-success/10 text-success",
      PENDING: "bg-warning/10 text-warning",
      PARTIAL: "bg-info/10 text-info",
      OVERDUE: "bg-error/10 text-error",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const getCompletionBadge = (status: string) => {
    const colors = {
      ACTIVE: "bg-success/10 text-success",
      COMPLETED: "bg-info/10 text-info",
      DROPPED: "bg-error/10 text-error",
      ON_HOLD: "bg-warning/10 text-warning",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading students...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Students</h1>
          <p className="mt-2 text-gray-600">Manage student enrollments and information</p>
        </div>
        <Link
          href="/dashboard/students/new"
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
        >
          + Add Student
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, phone, ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Level
            </label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Levels</option>
              <option value="NEW">New</option>
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="DROPPED">Dropped</option>
              <option value="ON_HOLD">On Hold</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Showing {students.length} student{students.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Student ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Batch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No students found. Click &quot;Add Student&quot; to create your first student.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {student.studentId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {student.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>{student.whatsapp}</div>
                      {student.email && (
                        <div className="text-xs text-gray-500">{student.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                        {student.currentLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {student.batch ? student.batch.batchCode : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(student.paymentStatus)}`}>
                        {student.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(Number(student.balance))}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${getCompletionBadge(student.completionStatus)}`}>
                        {student.completionStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/students/${student.id}`}
                          className="text-primary hover:text-primary-dark"
                        >
                          View
                        </Link>
                        <span className="text-gray-300">|</span>
                        <Link
                          href={`/dashboard/students/${student.id}/edit`}
                          className="text-info hover:text-info/80"
                        >
                          Edit
                        </Link>
                        <span className="text-gray-300">|</span>
                        <div className="inline-block">
                          <GenerateInvoiceButton
                            studentId={student.id}
                            variant="outline"
                            showPreview={false}
                          >
                            📄
                          </GenerateInvoiceButton>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
