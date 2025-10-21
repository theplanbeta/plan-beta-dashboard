"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { GenerateInvoiceButton } from "@/components/GenerateInvoiceButton"
import { MonthTabs } from "@/components/MonthTabs"
import { useMonthFilter } from "@/hooks/useMonthFilter"

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
  consecutiveAbsences: number
  attendanceRate: number
  churnRisk: 'LOW' | 'MEDIUM' | 'HIGH'
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
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("")
  const [churnRiskFilter, setChurnRiskFilter] = useState("")

  const isTeacher = session?.user?.role === 'TEACHER'

  // Check URL params for churn risk filter (from dashboard link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const churnRisk = params.get('churnRisk')
    if (churnRisk) {
      setChurnRiskFilter(churnRisk)
    }
  }, [])

  // Month filtering with URL sync
  const {
    selectedMonth,
    setSelectedMonth,
    filteredItems: monthFilteredStudents,
    monthCounts,
    sortedMonths,
  } = useMonthFilter({
    items: students,
    dateField: 'createdAt',
    includeUnscheduled: false,
  })

  useEffect(() => {
    fetchStudents()
  }, [search, levelFilter, paymentStatusFilter, churnRiskFilter])

  const fetchStudents = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (levelFilter) params.append("level", levelFilter)
      if (paymentStatusFilter) params.append("paymentStatus", paymentStatusFilter)
      if (churnRiskFilter) params.append("churnRisk", churnRiskFilter)

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

  const getChurnRiskBadge = (risk: string) => {
    const colors = {
      LOW: "bg-success/10 text-success border-success/20",
      MEDIUM: "bg-warning/10 text-warning border-warning/20",
      HIGH: "bg-error/10 text-error border-error/20",
    }
    const icons = {
      LOW: "✓",
      MEDIUM: "⚠️",
      HIGH: "⚠️",
    }
    return {
      color: colors[risk as keyof typeof colors] || "bg-gray-100 text-gray-800",
      icon: icons[risk as keyof typeof icons] || "",
    }
  }

  const getAbsenceAlert = (consecutiveAbsences: number) => {
    if (consecutiveAbsences >= 3) {
      return {
        show: true,
        color: "bg-error/10 text-error border-error/20",
        icon: "⚠️",
        text: `${consecutiveAbsences} Absences`,
      }
    } else if (consecutiveAbsences >= 2) {
      return {
        show: true,
        color: "bg-warning/10 text-warning border-warning/20",
        icon: "⚠️",
        text: `${consecutiveAbsences} Absences`,
      }
    }
    return { show: false, color: "", icon: "", text: "" }
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Students <span className="text-xs text-gray-400">[v2.0]</span></h1>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              Payment Status
            </label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Payment Status</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PENDING">Pending</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Churn Risk
            </label>
            <select
              value={churnRiskFilter}
              onChange={(e) => setChurnRiskFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Risk Levels</option>
              <option value="LOW">Low Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="HIGH">High Risk</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {monthFilteredStudents.length} student{monthFilteredStudents.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Month Tabs */}
      <MonthTabs
        selectedMonth={selectedMonth}
        onMonthSelect={setSelectedMonth}
        monthCounts={monthCounts}
        sortedMonths={sortedMonths}
        includeUnscheduled={false}
        renderStats={(monthKey, count) => {
          const monthStudents = students.filter(s => {
            if (!s.createdAt) return false
            const date = new Date(s.createdAt)
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            return key === monthKey
          })
          const activeCount = monthStudents.filter(s => s.completionStatus === 'ACTIVE').length
          const activeRate = count > 0 ? Math.round((activeCount / count) * 100) : 0
          return (
            <span className="text-xs">
              {activeRate}% active
            </span>
          )
        }}
      />

      {/* Students Table/Cards - Desktop: Table, Mobile: Cards */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Mobile Card View */}
        <div className="md:hidden space-y-3 p-3">
          {monthFilteredStudents.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-gray-500 dark:text-gray-400">
                {students.length === 0 ? 'No students found' : 'No students found for the selected month'}
              </p>
              {students.length === 0 && (
                <Link
                  href="/dashboard/students/new"
                  className="text-primary hover:text-primary-dark mt-2 inline-block"
                >
                  Add your first student
                </Link>
              )}
            </div>
          ) : (
            monthFilteredStudents.map((student) => (
              <div key={student.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-5 space-y-4 border border-gray-200 dark:border-gray-600">
                {/* Name & ID */}
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{student.name}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-primary/10 text-primary">
                      {student.studentId}
                    </span>
                    <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${getCompletionBadge(student.completionStatus)}`}>
                      {student.completionStatus}
                    </span>
                    {student.churnRisk !== 'LOW' && (
                      <span
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${getChurnRiskBadge(student.churnRisk).color}`}
                        title={`Churn risk: ${student.churnRisk}`}
                      >
                        {getChurnRiskBadge(student.churnRisk).icon} {student.churnRisk} Risk
                      </span>
                    )}
                    {getAbsenceAlert(student.consecutiveAbsences).show && (
                      <span
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${getAbsenceAlert(student.consecutiveAbsences).color}`}
                        title={`Student has missed ${student.consecutiveAbsences} consecutive classes`}
                      >
                        {getAbsenceAlert(student.consecutiveAbsences).icon} {getAbsenceAlert(student.consecutiveAbsences).text}
                      </span>
                    )}
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
                {!isTeacher && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {monthFilteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={isTeacher ? 6 : 9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {students.length === 0
                      ? 'No students found. Click "Add Student" to create your first student.'
                      : 'No students found for the selected month.'}
                  </td>
                </tr>
              ) : (
                monthFilteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {student.studentId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{student.name}</span>
                        {student.churnRisk !== 'LOW' && (
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded border ${getChurnRiskBadge(student.churnRisk).color}`}
                            title={`Churn risk: ${student.churnRisk}`}
                          >
                            {getChurnRiskBadge(student.churnRisk).icon} {student.churnRisk}
                          </span>
                        )}
                        {getAbsenceAlert(student.consecutiveAbsences).show && (
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded border ${getAbsenceAlert(student.consecutiveAbsences).color}`}
                            title={`Student has missed ${student.consecutiveAbsences} consecutive classes`}
                          >
                            {getAbsenceAlert(student.consecutiveAbsences).icon} {getAbsenceAlert(student.consecutiveAbsences).text}
                          </span>
                        )}
                      </div>
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
                    {!isTeacher && (
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
                    )}
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
