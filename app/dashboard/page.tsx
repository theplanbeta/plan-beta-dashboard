"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import TeacherDashboard from "./components/TeacherDashboard"
import MarketingDashboard from "./components/MarketingDashboard"
import type { UserRole } from "@/lib/permissions"

type DashboardData = {
  students: {
    total: number
    active: number
    completed: number
    dropped: number
    recentEnrollments: number
    levelDistribution: Record<string, number>
  }
  financial: {
    totalRevenue: number
    totalPending: number
    avgRevPerStudent: number
    recentRevenue: number
    paymentBreakdown: Record<string, number>
    enrollmentBreakdown: Record<string, number>
  }
  batches: {
    total: number
    active: number
    avgFillRate: number
    totalSeatsAvailable: number
    totalSeatsOccupied: number
    utilizationRate: number
  }
  referrals: {
    total: number
    completed: number
    pendingPayouts: number
    totalPayouts: number
    conversionRate: number
  }
  attendance: {
    avgRate: number
  }
  churnRisk: {
    low: number
    medium: number
    high: number
  }
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  // Role-based routing
  const userRole = session?.user?.role as UserRole
  const userName = session?.user?.name || 'User'

  // Continue with FOUNDER dashboard below
  useEffect(() => {
    if (userRole === 'TEACHER' || userRole === 'MARKETING') return
    fetchDashboardData()
  }, [userRole])

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/analytics/dashboard")
      const analyticsData = await res.json()
      setData(analyticsData)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Show role-specific dashboards
  if (userRole === 'TEACHER') {
    return <TeacherDashboard userName={userName} />
  }

  if (userRole === 'MARKETING') {
    return <MarketingDashboard userName={userName} />
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {session?.user?.name}!
          </h1>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {session?.user?.name}!
        </h1>
        <p className="mt-2 text-gray-600">
          Here&apos;s what&apos;s happening with your school today.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/students" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{data.students.total}</p>
              <p className="text-xs text-success mt-1">
                +{data.students.recentEnrollments} this month
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-full">
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/batches" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Active Batches</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{data.batches.active}</p>
              <p className="text-xs text-info mt-1">
                {data.batches.avgFillRate.toFixed(0)}% avg fill rate
              </p>
            </div>
            <div className="p-3 bg-success/10 rounded-full">
              <svg
                className="w-6 h-6 text-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/payments" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="mt-2 text-3xl font-semibold text-success">
                {formatCurrency(data.financial.totalRevenue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                +{formatCurrency(data.financial.recentRevenue)} this month
              </p>
            </div>
            <div className="p-3 bg-warning/10 rounded-full">
              <svg
                className="w-6 h-6 text-warning"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/attendance" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {data.attendance.avgRate.toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Average across all students</p>
            </div>
            <div className="p-3 bg-info/10 rounded-full">
              <svg
                className="w-6 h-6 text-info"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-foreground mb-4">Student Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Active</span>
              <div className="flex items-center space-x-2">
                <div className="w-48 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-success h-2 rounded-full"
                    style={{ width: `${data.students.total > 0 ? (data.students.active / data.students.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="font-semibold w-12 text-right">{data.students.active}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Completed</span>
              <div className="flex items-center space-x-2">
                <div className="w-48 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-info h-2 rounded-full"
                    style={{ width: `${data.students.total > 0 ? (data.students.completed / data.students.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="font-semibold w-12 text-right">{data.students.completed}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Dropped</span>
              <div className="flex items-center space-x-2">
                <div className="w-48 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-error h-2 rounded-full"
                    style={{ width: `${data.students.total > 0 ? (data.students.dropped / data.students.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="font-semibold w-12 text-right">{data.students.dropped}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-foreground mb-4">Payment Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Paid</span>
              <div className="flex items-center space-x-2">
                <div className="w-48 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-success h-2 rounded-full"
                    style={{ width: `${data.students.total > 0 ? (data.financial.paymentBreakdown.paid / data.students.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="font-semibold w-12 text-right">{data.financial.paymentBreakdown.paid}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Partial</span>
              <div className="flex items-center space-x-2">
                <div className="w-48 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-info h-2 rounded-full"
                    style={{ width: `${data.students.total > 0 ? (data.financial.paymentBreakdown.partial / data.students.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="font-semibold w-12 text-right">{data.financial.paymentBreakdown.partial}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Overdue</span>
              <div className="flex items-center space-x-2">
                <div className="w-48 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-error h-2 rounded-full"
                    style={{ width: `${data.students.total > 0 ? (data.financial.paymentBreakdown.overdue / data.students.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="font-semibold w-12 text-right">{data.financial.paymentBreakdown.overdue}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Churn Risk Alert */}
      {data.churnRisk.high > 0 && (
        <div className="bg-error/10 border border-error p-4 rounded-md">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-error">⚠️ High Churn Risk Alert</h3>
              <p className="text-sm text-gray-700 mt-1">
                {data.churnRisk.high} student(s) at high risk of dropping out.
                Review attendance and engagement immediately.
              </p>
            </div>
            <Link
              href="/dashboard/students"
              className="px-4 py-2 bg-error text-white rounded-md hover:bg-error/90"
            >
              View Students
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/dashboard/students/new"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
          >
            <h3 className="font-medium text-foreground">Add New Student</h3>
            <p className="mt-1 text-sm text-gray-600">Enroll a new student</p>
          </Link>
          <Link
            href="/dashboard/attendance/bulk"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
          >
            <h3 className="font-medium text-foreground">Mark Attendance</h3>
            <p className="mt-1 text-sm text-gray-600">Record today&apos;s attendance</p>
          </Link>
          <Link
            href="/dashboard/payments/new"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
          >
            <h3 className="font-medium text-foreground">Record Payment</h3>
            <p className="mt-1 text-sm text-gray-600">Log a new payment</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
