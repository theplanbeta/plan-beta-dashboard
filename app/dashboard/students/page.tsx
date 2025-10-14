"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { GenerateInvoiceButton } from "@/components/GenerateInvoiceButton"

type Student = {
  id: string
  studentId: string
  name: string
  whatsapp: string
  email: string | null
  currentLevel: string
  isCombo: boolean
  comboLevels: string[]
  paymentStatus: string
  finalPrice: number
  balance: number
  currency: string
  completionStatus: string
  batch: {
    id: string
    batchCode: string
  } | null
  createdAt: string
}

export default function StudentsPage() {
  const { data: session } = useSession()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [levelFilter, setLevelFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const isTeacher = session?.user?.role === 'TEACHER'

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

  const getEnrollmentDisplay = (student: Student) => {
    if (student.isCombo && student.comboLevels.length > 0) {
      return `Combo: ${student.comboLevels.join(', ')}`
    }
    return student.currentLevel
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Students</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Manage student enrollments and information</p>
        </div>
        {!isTeacher && (
          <Link
            href="/dashboard/students/new"
            className="btn-primary"
          >
            + Add Student
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, phone, ID..."
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Level
            </label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="DROPPED">Dropped</option>
              <option value="ON_HOLD">On Hold</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {students.length} student{students.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Students Table/Cards - Desktop: Table, Mobile: Cards */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Mobile Card View */}
        <div className="md:hidden space-y-3 p-3">
          {students.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-gray-500 dark:text-gray-400">No students found</p>
              <Link
                href="/dashboard/students/new"
                className="text-primary hover:text-primary-dark mt-2 inline-block"
              >
                Add your first student
              </Link>
            </div>
          ) : (
            students.map((student) => (
              <div key={student.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-5 space-y-4 border border-gray-200 dark:border-gray-600">
                {/* Name & ID */}
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{student.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-primary/10 text-primary">
                      {student.studentId}
                    </span>
                    <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${getCompletionBadge(student.completionStatus)}`}>
                      {student.completionStatus}
                    </span>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2.5 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📱</span>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{student.whatsapp}</div>
                  </div>
                  {student.email && (
                    <div className="flex items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-xl">📧</span>
                      <div className="text-sm text-gray-700 dark:text-gray-300 break-all">{student.email}</div>
                    </div>
                  )}
                </div>

                {/* Level & Batch */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {student.isCombo ? 'Combo Levels' : 'Level'}
                    </div>
                    <div className="text-base font-bold text-gray-900 dark:text-white">
                      {getEnrollmentDisplay(student)}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Batch</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {student.batch ? student.batch.batchCode : "-"}
                    </div>
                  </div>
                </div>

                {/* Payment Info - Hidden for teachers */}
                {!isTeacher && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Payment Status</span>
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusBadge(student.paymentStatus)}`}>
                        {student.paymentStatus}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Balance Due</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(Number(student.balance), student.currency as 'EUR' | 'INR')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions - Hidden for teachers */}
                {!isTeacher && (
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/students/${student.id}`}
                      className="flex-1 py-3 px-4 text-center bg-primary text-white rounded-xl text-sm font-semibold shadow-sm"
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/dashboard/students/${student.id}/edit`}
                      className="py-3 px-4 bg-info/10 text-info rounded-xl text-sm font-semibold"
                    >
                      Edit
                    </Link>
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
                )}
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                  Student ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                  Batch
                </th>
                {!isTeacher && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                      Balance
                    </th>
                  </>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={isTeacher ? 7 : 9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No students found. Click &quot;Add Student&quot; to create your first student.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {student.studentId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {student.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      <div>{student.whatsapp}</div>
                      {student.email && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{student.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 rounded text-xs inline-block ${
                          student.isCombo ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {student.isCombo ? 'Combo' : student.currentLevel}
                        </span>
                        {student.isCombo && student.comboLevels.length > 0 && (
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {student.comboLevels.join(', ')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {student.batch ? student.batch.batchCode : "-"}
                    </td>
                    {!isTeacher && (
                      <>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(student.paymentStatus)}`}>
                            {student.paymentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {formatCurrency(Number(student.balance), student.currency as 'EUR' | 'INR')}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${getCompletionBadge(student.completionStatus)}`}>
                        {student.completionStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {!isTeacher ? (
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
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
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
