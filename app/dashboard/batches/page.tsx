"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { normalizeCurrency } from "@/lib/currency"
import { MonthTabs } from "@/components/MonthTabs"
import { useMonthFilter } from "@/hooks/useMonthFilter"
import {
  calculateBatchProgress,
  getDaysRemaining,
  formatDaysRemaining,
  getProgressBarColor,
  isEndingSoon,
  getBatchMonthStats,
} from "@/lib/batch-utils"

type Batch = {
  id: string
  batchCode: string
  level: string
  currency?: string | null
  totalSeats: number
  enrolledCount: number
  fillRate: number
  status: string
  startDate: string | null
  endDate: string | null
  revenueTarget: number
  revenueActual: number
  teacherCost: number
  profit: number
  teacher: {
    id: string
    name: string
  } | null
  students: Array<{
    id: string
    name: string
  }>
}

export default function BatchesPage() {
  const { data: session } = useSession()
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [levelFilter, setLevelFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const isTeacher = session?.user?.role === 'TEACHER'

  // Month filtering with URL sync
  const {
    selectedMonth,
    setSelectedMonth,
    filteredItems: monthFilteredBatches,
    monthCounts,
    sortedMonths,
  } = useMonthFilter({
    items: batches,
    dateField: 'startDate',
    includeUnscheduled: true,
  })

  useEffect(() => {
    fetchBatches()
  }, [levelFilter, statusFilter])

  const fetchBatches = async () => {
    try {
      const params = new URLSearchParams()
      if (levelFilter) params.append("level", levelFilter)
      if (statusFilter) params.append("status", statusFilter)

      const res = await fetch(`/api/batches?${params.toString()}`)
      const data = await res.json()
      setBatches(data)
    } catch (error) {
      console.error("Error fetching batches:", error)
    } finally {
      setLoading(false)
    }
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
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const getFillRateColor = (rate: number) => {
    if (rate >= 80) return "text-success"
    if (rate >= 50) return "text-warning"
    return "text-error"
  }

  // Calculate overview stats (from filtered batches)
  const displayBatches = monthFilteredBatches
  const totalBatches = displayBatches.length
  const activeBatches = displayBatches.filter((b) => b.status === "RUNNING" || b.status === "FILLING").length
  const totalStudents = displayBatches.reduce((sum, b) => sum + b.enrolledCount, 0)
  const avgFillRate =
    displayBatches.length > 0
      ? displayBatches.reduce((sum, b) => sum + b.fillRate, 0) / displayBatches.length
      : 0

  // Render stats for month tabs
  const renderMonthStats = (monthKey: string, count: number) => {
    if (!selectedMonth) return null
    const stats = getBatchMonthStats(batches, monthKey)
    return (
      <span className="flex items-center gap-2 text-xs">
        <span className="text-green-600 dark:text-green-400">🟢 {stats.starting}</span>
        <span className="text-red-600 dark:text-red-400">🔴 {stats.ending}</span>
        <span className="text-blue-600 dark:text-blue-400">🔵 {stats.running}</span>
      </span>
    )
  }

  // Get teachers freeing up in selected month
  const teachersFreeingThisMonth = useMemo(() => {
    if (!selectedMonth || selectedMonth === 'all' || selectedMonth === 'unscheduled') return []

    const endingBatches = batches.filter(batch => {
      if (!batch.endDate || !batch.teacher) return false
      const endDate = new Date(batch.endDate)
      const [year, month] = selectedMonth.split('-').map(Number)
      return endDate.getFullYear() === year && endDate.getMonth() + 1 === month
    })

    // Group by teacher to avoid duplicates
    const teacherMap = new Map<string, {
      teacher: { id: string; name: string }
      batches: Array<{ batchCode: string; level: string; endDate: string }>
    }>()

    endingBatches.forEach(batch => {
      if (!batch.teacher) return
      const existing = teacherMap.get(batch.teacher.id)
      if (existing) {
        existing.batches.push({
          batchCode: batch.batchCode,
          level: batch.level,
          endDate: batch.endDate!
        })
      } else {
        teacherMap.set(batch.teacher.id, {
          teacher: batch.teacher,
          batches: [{
            batchCode: batch.batchCode,
            level: batch.level,
            endDate: batch.endDate!
          }]
        })
      }
    })

    return Array.from(teacherMap.values()).sort((a, b) => {
      const dateA = new Date(a.batches[0].endDate)
      const dateB = new Date(b.batches[0].endDate)
      return dateA.getTime() - dateB.getTime()
    })
  }, [batches, selectedMonth])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading batches...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Batches</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Manage course batches and capacity</p>
        </div>
        {!isTeacher && (
          <Link
            href="/dashboard/batches/new"
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            + Create Batch
          </Link>
        )}
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-300">Total Batches</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalBatches}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-300">Active Batches</div>
          <div className="text-2xl font-bold text-success dark:text-green-400 mt-1">{activeBatches}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-300">Total Students</div>
          <div className="text-2xl font-bold text-info dark:text-blue-400 mt-1">{totalStudents}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-300">Avg Fill Rate</div>
          <div className={`text-2xl font-bold mt-1 ${getFillRateColor(avgFillRate)}`}>
            {avgFillRate.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <option value="PLANNING">Planning</option>
              <option value="FILLING">Filling</option>
              <option value="FULL">Full</option>
              <option value="RUNNING">Running</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Month Tabs */}
      <MonthTabs
        selectedMonth={selectedMonth}
        onMonthSelect={setSelectedMonth}
        monthCounts={monthCounts}
        sortedMonths={sortedMonths}
        includeUnscheduled={true}
        renderStats={renderMonthStats}
      />

      {/* Teachers Freeing This Month */}
      {teachersFreeingThisMonth.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg shadow-sm dark:shadow-md border border-green-200 dark:border-green-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                ✨ Teachers Becoming Available
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 rounded-full text-sm">
                  {teachersFreeingThisMonth.length}
                </span>
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                These teachers will complete their batches this month
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teachersFreeingThisMonth.map(({ teacher, batches: endingBatches }) => (
              <div
                key={teacher.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{teacher.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {endingBatches.length} {endingBatches.length === 1 ? 'batch' : 'batches'} ending
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                    Available Soon
                  </span>
                </div>

                <div className="space-y-2">
                  {endingBatches.map((batch, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-700 rounded p-2"
                    >
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">{batch.batchCode}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{batch.level}</span>
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {formatDate(batch.endDate)}
                      </span>
                    </div>
                  ))}
                </div>

                {!isTeacher && (
                  <Link
                    href="/dashboard/batches/new"
                    className="mt-3 w-full block text-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
                  >
                    Plan New Batch
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Batches Grid */}
      {displayBatches.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
          <div className="text-gray-500 dark:text-gray-400">
            {batches.length === 0
              ? 'No batches found. Click "Create Batch" to add your first batch.'
              : `No batches found for ${selectedMonth === 'unscheduled' ? 'unscheduled' : 'the selected month'}.`}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayBatches.map((batch) => {
            const progress = calculateBatchProgress(batch)
            const daysLeft = getDaysRemaining(batch)
            const endingSoon = isEndingSoon(batch)

            return (
            <Link
              key={batch.id}
              href={`/dashboard/batches/${batch.id}`}
              className="bg-gray-50 dark:bg-gray-700 rounded-xl p-5 hover:shadow-md dark:hover:shadow-lg transition-shadow space-y-4 border border-gray-200 dark:border-gray-600"
            >
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {batch.batchCode}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Level {batch.level}</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusBadge(batch.status)}`}>
                    {batch.status}
                  </span>
                </div>
              </div>

              {/* Fill Rate Progress */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-200 dark:border-gray-600">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Capacity</span>
                  <span className={`text-sm font-bold ${getFillRateColor(batch.fillRate)}`}>
                    {batch.enrolledCount}/{batch.totalSeats}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      batch.fillRate >= 80
                        ? "bg-success dark:bg-green-400"
                        : batch.fillRate >= 50
                        ? "bg-warning dark:bg-yellow-400"
                        : "bg-error dark:bg-red-400"
                    }`}
                    style={{ width: `${Math.min(batch.fillRate, 100)}%` }}
                  />
                </div>
                <div className="text-center">
                  <span className={`text-lg font-bold ${getFillRateColor(batch.fillRate)}`}>
                    {batch.fillRate.toFixed(0)}%
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400"> filled</span>
                </div>
              </div>

              {/* Teacher */}
              {batch.teacher && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Teacher</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{batch.teacher.name}</div>
                </div>
              )}

              {/* Lifecycle Timeline */}
              {batch.startDate && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600 space-y-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Timeline</div>

                  {/* Start Date */}
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Started: {formatDate(batch.startDate)}
                  </div>

                  {/* Progress Bar (if has end date) */}
                  {batch.endDate && (
                    <>
                      <div className="space-y-2">
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${getProgressBarColor(progress)}`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-600 dark:text-gray-400">
                            {progress.toFixed(0)}% complete
                          </span>
                          <span className={`font-semibold ${daysLeft !== null && daysLeft > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
                            {formatDaysRemaining(daysLeft)}
                          </span>
                        </div>
                      </div>

                      {/* End Date */}
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Ends: {formatDate(batch.endDate)}
                      </div>

                      {/* Ending Soon Alert */}
                      {endingSoon && batch.teacher && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
                          <div className="text-xs text-amber-800 dark:text-amber-200">
                            ⚠️ <span className="font-semibold">{batch.teacher.name}</span> will be available for new assignments from {formatDate(batch.endDate)}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

            </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
