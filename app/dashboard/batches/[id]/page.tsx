"use client"

import { use, useState, useEffect, Fragment } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Dialog, Transition } from "@headlessui/react"
import { CheckCircleIcon, ArrowPathIcon } from "@heroicons/react/24/outline"
import { formatCurrency, formatDate } from "@/lib/utils"
import { normalizeCurrency } from "@/lib/currency"

type Batch = {
  id: string
  batchCode: string
  level: string
  currency: "EUR" | "INR"
  totalSeats: number
  enrolledCount: number
  fillRate: number
  revenueTarget: number
  revenueActual: number
  revenuePotential?: number
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
    currency: string | null
    currentLevel: string
    paymentStatus: string
    finalPrice: number
    totalPaid: number
    balance: number
    classesAttended: number
    totalClasses: number
    attendanceRate: number | null
  }>
}

export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const [batch, setBatch] = useState<Batch | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [completeModalOpen, setCompleteModalOpen] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [setEndDateToToday, setSetEndDateToToday] = useState(true)

  const isTeacher = session?.user?.role === 'TEACHER'

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

  const handleMarkComplete = async () => {
    setCompleting(true)
    try {
      const res = await fetch(`/api/batches/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setEndDate: setEndDateToToday }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to complete batch")
      }

      setCompleteModalOpen(false)
      fetchBatch() // Refresh batch data
    } catch (error: unknown) {
      console.error("Error completing batch:", error)
      alert(error instanceof Error ? error.message : "Failed to complete batch")
    } finally {
      setCompleting(false)
    }
  }

  const handleReopenBatch = async () => {
    if (!confirm("Are you sure you want to reopen this batch? It will be set back to RUNNING status.")) {
      return
    }

    try {
      const res = await fetch(`/api/batches/${id}/complete`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to reopen batch")
      }

      fetchBatch() // Refresh batch data
    } catch (error: unknown) {
      console.error("Error reopening batch:", error)
      alert(error instanceof Error ? error.message : "Failed to reopen batch")
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

  const batchCurrency = normalizeCurrency(batch.currency)

  const formatAmount = (amount: number) => formatCurrency(amount, batchCurrency)

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
        <div className="flex flex-wrap gap-3">
          {!isTeacher && (
            <>
              {batch.status !== "COMPLETED" ? (
                <button
                  onClick={() => setCompleteModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-md hover:from-emerald-600 hover:to-teal-700 shadow-sm transition-all"
                >
                  <CheckCircleIcon className="h-5 w-5" />
                  Mark Complete
                </button>
              ) : (
                <button
                  onClick={handleReopenBatch}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 shadow-sm transition-all"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                  Reopen Batch
                </button>
              )}
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
            </>
          )}
          <Link
            href="/dashboard/batches"
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Back
          </Link>
        </div>
      </div>

      {/* Overview Stats */}
      {!isTeacher ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600">Fill Rate</div>
            <div className={`text-2xl font-bold mt-1 ${getFillRateColor(batch.fillRate)}`}>
              {batch.fillRate.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {batch.enrolledCount} / {batch.totalSeats} seats
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600">Revenue</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {formatAmount(Number(batch.revenueActual))}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Target: {formatAmount(Number(batch.revenueTarget))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600">Profit</div>
            <div className={`text-2xl font-bold mt-1 ${batch.profit >= 0 ? "text-success" : "text-error"}`}>
              {formatAmount(Number(batch.profit))}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Margin: {profitMargin}%
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600">Teacher Cost</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {formatAmount(Number(batch.teacherCost))}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {batch.teacher?.name || "Not assigned"}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600">Fill Rate</div>
            <div className={`text-2xl font-bold mt-1 ${getFillRateColor(batch.fillRate)}`}>
              {batch.fillRate.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {batch.enrolledCount} / {batch.totalSeats} seats
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600">Students Enrolled</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {batch.enrolledCount}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Total Capacity: {batch.totalSeats}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Roster */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Student Roster</h2>
              {!isTeacher && (
                <Link
                  href={`/dashboard/students/new?batchId=${batch.id}`}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark text-sm"
                >
                  + Add Student
                </Link>
              )}
            </div>

            {batch.students.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No students enrolled yet. Click &quot;Add Student&quot; to enroll.
              </div>
            ) : (
              <div className="space-y-3">
                {batch.students.map((student) => (
                  !isTeacher ? (
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
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(student.paymentStatus)}`}>
                          {student.paymentStatus}
                        </span>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {formatCurrency(
                              Number(student.totalPaid ?? 0),
                              normalizeCurrency(student.currency)
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            of {formatCurrency(
                              Number(student.finalPrice ?? 0),
                              normalizeCurrency(student.currency)
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
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
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Batch Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
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

          {/* Financial Breakdown - Hidden for teachers */}
          {!isTeacher && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-foreground mb-4">Financial Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Revenue Target</span>
                  <span className="font-medium">{formatAmount(Number(batch.revenueTarget))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Revenue Actual</span>
                  <span className="font-medium text-success">
                    {formatAmount(Number(batch.revenueActual))}
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="text-gray-600">Teacher Cost</span>
                  <span className="font-medium text-error">
                    {formatAmount(Number(batch.teacherCost))}
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="font-semibold">Net Profit</span>
                  <span className={`font-semibold ${batch.profit >= 0 ? "text-success" : "text-error"}`}>
                    {formatAmount(Number(batch.profit))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Profit Margin</span>
                  <span className="font-medium">{profitMargin}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Capacity Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
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

      {/* Mark Complete Modal */}
      <Transition appear show={completeModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setCompleteModalOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                  {/* Success Icon */}
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg">
                    <CheckCircleIcon className="h-10 w-10 text-white" />
                  </div>

                  <Dialog.Title className="mt-4 text-center text-xl font-semibold text-gray-900 dark:text-white">
                    Complete This Batch?
                  </Dialog.Title>

                  <div className="mt-3 text-center">
                    <p className="text-gray-600 dark:text-gray-300">
                      You are about to mark <span className="font-semibold text-gray-900 dark:text-white">{batch.batchCode}</span> as completed.
                    </p>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      This batch has {batch.enrolledCount} student{batch.enrolledCount !== 1 ? 's' : ''} enrolled.
                    </p>
                  </div>

                  {/* Options */}
                  <div className="mt-5 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={setEndDateToToday}
                        onChange={(e) => setSetEndDateToToday(e.target.checked)}
                        className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Set end date to today
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCompleteModalOpen(false)}
                      disabled={completing}
                      className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleMarkComplete}
                      disabled={completing}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:from-emerald-600 hover:to-teal-700 shadow-sm transition-all disabled:opacity-50"
                    >
                      {completing ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Completing...
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon className="h-4 w-4" />
                          Complete Batch
                        </>
                      )}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}
