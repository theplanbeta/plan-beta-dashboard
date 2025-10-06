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
          <h1 className="text-3xl font-bold text-foreground">Batches</h1>
          <p className="mt-2 text-gray-600">Manage course batches and capacity</p>
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
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Batches</div>
          <div className="text-2xl font-bold text-foreground mt-1">{totalBatches}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Active Batches</div>
          <div className="text-2xl font-bold text-success mt-1">{activeBatches}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Students</div>
          <div className="text-2xl font-bold text-info mt-1">{totalStudents}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Avg Fill Rate</div>
          <div className={`text-2xl font-bold mt-1 ${getFillRateColor(avgFillRate)}`}>
            {avgFillRate.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <option value="PLANNING">Planning</option>
              <option value="FILLING">Filling</option>
              <option value="FULL">Full</option>
              <option value="RUNNING">Running</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Batches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {batches.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
            <div className="text-gray-500">
              No batches found. Click &quot;Create Batch&quot; to add your first batch.
            </div>
          </div>
        ) : (
          batches.map((batch) => (
            <Link
              key={batch.id}
              href={`/dashboard/batches/${batch.id}`}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {batch.batchCode}
                  </h3>
                  <p className="text-sm text-gray-600">Level {batch.level}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(batch.status)}`}>
                  {batch.status}
                </span>
              </div>

              {/* Fill Rate Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Capacity</span>
                  <span className={`font-semibold ${getFillRateColor(batch.fillRate)}`}>
                    {batch.enrolledCount}/{batch.totalSeats} ({batch.fillRate.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      batch.fillRate >= 80
                        ? "bg-success"
                        : batch.fillRate >= 50
                        ? "bg-warning"
                        : "bg-error"
                    }`}
                    style={{ width: `${Math.min(batch.fillRate, 100)}%` }}
                  />
                </div>
              </div>

              {/* Teacher */}
              {batch.teacher && (
                <div className="mb-4 text-sm">
                  <span className="text-gray-600">Teacher: </span>
                  <span className="font-medium">{batch.teacher.name}</span>
                </div>
              )}

              {/* Dates */}
              {batch.startDate && (
                <div className="mb-4 text-sm text-gray-600">
                  {formatDate(batch.startDate)}
                  {batch.endDate && ` - ${formatDate(batch.endDate)}`}
                </div>
              )}

              {/* Revenue */}
              <div className="border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Revenue</span>
                  <span className="font-semibold">
                    {formatCurrency(Number(batch.revenueActual || 0))}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Target</span>
                  <span className="text-gray-500">
                    {formatCurrency(Number(batch.revenueTarget))}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
