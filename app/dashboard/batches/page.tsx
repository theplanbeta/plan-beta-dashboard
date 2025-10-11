"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"

type Batch = {
  id: string
  batchCode: string
  level: string
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
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [levelFilter, setLevelFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

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

  // Calculate overview stats
  const totalBatches = batches.length
  const activeBatches = batches.filter((b) => b.status === "RUNNING" || b.status === "FILLING").length
  const totalStudents = batches.reduce((sum, b) => sum + b.enrolledCount, 0)
  const avgFillRate =
    batches.length > 0
      ? batches.reduce((sum, b) => sum + b.fillRate, 0) / batches.length
      : 0

  // Group batches by month/year of start date
  const batchesByMonth = batches.reduce((acc, batch) => {
    if (!batch.startDate) {
      // Batches without start date go to "Unscheduled"
      if (!acc["Unscheduled"]) acc["Unscheduled"] = []
      acc["Unscheduled"].push(batch)
      return acc
    }

    const date = new Date(batch.startDate)
    const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    if (!acc[monthYear]) acc[monthYear] = []
    acc[monthYear].push(batch)
    return acc
  }, {} as Record<string, Batch[]>)

  // Sort month keys chronologically
  const sortedMonths = Object.keys(batchesByMonth).sort((a, b) => {
    if (a === "Unscheduled") return 1
    if (b === "Unscheduled") return -1
    return new Date(a).getTime() - new Date(b).getTime()
  })

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
        <Link
          href="/dashboard/batches/new"
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
        >
          + Create Batch
        </Link>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-xl border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-300">Total Batches</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalBatches}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-xl border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-300">Active Batches</div>
          <div className="text-2xl font-bold text-success dark:text-green-400 mt-1">{activeBatches}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-xl border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-300">Total Students</div>
          <div className="text-2xl font-bold text-info dark:text-blue-400 mt-1">{totalStudents}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-xl border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-300">Avg Fill Rate</div>
          <div className={`text-2xl font-bold mt-1 ${getFillRateColor(avgFillRate)}`}>
            {avgFillRate.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow dark:shadow-xl border border-gray-200 dark:border-gray-700">
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

      {/* Batches by Month */}
      {batches.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-xl border border-gray-200 dark:border-gray-700">
          <div className="text-gray-500 dark:text-gray-400">
            No batches found. Click &quot;Create Batch&quot; to add your first batch.
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedMonths.map((monthYear) => (
            <div key={monthYear} className="space-y-4">
              {/* Month Header */}
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{monthYear}</h2>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm rounded">
                  {batchesByMonth[monthYear].length} {batchesByMonth[monthYear].length === 1 ? 'batch' : 'batches'}
                </span>
              </div>

              {/* Batches Grid - Mobile friendly */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {batchesByMonth[monthYear].map((batch) => (
            <Link
              key={batch.id}
              href={`/dashboard/batches/${batch.id}`}
              className="bg-gray-50 dark:bg-gray-700 rounded-xl p-5 hover:shadow-lg dark:hover:shadow-2xl transition-shadow space-y-4 border border-gray-200 dark:border-gray-600"
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

              {/* Dates */}
              {batch.startDate && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Schedule</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(batch.startDate)}
                    {batch.endDate && (
                      <>
                        <br />
                        <span className="text-xs text-gray-600 dark:text-gray-400">to {formatDate(batch.endDate)}</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Revenue */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-2 border border-gray-200 dark:border-gray-600">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Revenue</span>
                  <span className="text-base font-bold text-gray-900 dark:text-white">
                    {formatCurrency(Number(batch.revenueActual || 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Target</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {formatCurrency(Number(batch.revenueTarget))}
                  </span>
                </div>
              </div>
            </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
