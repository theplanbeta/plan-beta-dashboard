"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
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
    totalRevenueEur: number
    totalRevenueInr: number
    totalRevenueInrEurEquivalent: number
    totalRevenueCombined: number
    totalPending: number
    avgRevPerStudent: number
    recentRevenue: number
    recentRevenueEur: number
    recentRevenueInr: number
    recentRevenueInrEurEquivalent: number
    recentRevenueCombined: number
    paymentBreakdown: Record<string, number>
    enrollmentBreakdown: Record<string, number>
    monthlyRevenue: Array<{
      month: string
      year: number
      revenueEur: number
      revenueInr: number
      revenueInrEurEquivalent: number
      revenueCombined: number
    }>
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
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  // Role-based routing
  const userRole = session?.user?.role as UserRole
  const userName = session?.user?.name || 'User'

  // Check if teacher needs account setup
  useEffect(() => {
    if (userRole === 'TEACHER' && session?.user?.email?.includes('@planbeta.internal')) {
      router.push('/dashboard/account-setup')
    }
  }, [userRole, session?.user?.email, router])

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {session?.user?.name}!
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back, {session?.user?.name}!
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Here&apos;s what&apos;s happening with your school today.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/students" className="panel panel-hover p-6 hover:scale-105 transition-all">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Students</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{data.students.total}</p>
              <p className="text-xs text-success dark:text-green-400 mt-1">
                +{data.students.recentEnrollments} this month
              </p>
            </div>
            <div className="p-3 bg-primary/10 dark:bg-primary/20 rounded-full">
              <svg
                className="w-6 h-6 text-primary dark:text-red-400"
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

        <Link href="/dashboard/batches" className="panel panel-hover p-6 hover:scale-105 transition-all">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Batches</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{data.batches.active}</p>
              <p className="text-xs text-info dark:text-blue-400 mt-1">
                {data.batches.avgFillRate.toFixed(0)}% avg fill rate
              </p>
            </div>
            <div className="p-3 bg-success/10 dark:bg-success/20 rounded-full">
              <svg
                className="w-6 h-6 text-success dark:text-green-400"
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

        <Link href="/dashboard/payments" className="panel panel-hover p-6 hover:scale-105 transition-all">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Revenue</p>
              <p className="mt-2 text-3xl font-semibold text-success dark:text-green-400">
                {formatCurrency(data.financial.totalRevenueCombined, 'EUR')}
              </p>
              {(data.financial.totalRevenueEur > 0 || data.financial.totalRevenueInr > 0) && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                  {data.financial.totalRevenueEur > 0 && (
                    <div>EUR: {formatCurrency(data.financial.totalRevenueEur, 'EUR')}</div>
                  )}
                  {data.financial.totalRevenueInr > 0 && (
                    <div>INR: {formatCurrency(data.financial.totalRevenueInr, 'INR')} (€{data.financial.totalRevenueInrEurEquivalent.toFixed(2)} equiv)</div>
                  )}
                </div>
              )}
              <div className="text-xs text-success dark:text-green-400 mt-2">
                +{formatCurrency(data.financial.recentRevenueCombined, 'EUR')} this month
              </div>
            </div>
            <div className="p-3 bg-warning/10 dark:bg-warning/20 rounded-full">
              <svg
                className="w-6 h-6 text-warning dark:text-yellow-400"
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

        <Link href="/dashboard/attendance" className="panel panel-hover p-6 hover:scale-105 transition-all">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Attendance Rate</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
                {data.attendance.avgRate.toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Average across all students</p>
            </div>
            <div className="p-3 bg-info/10 dark:bg-info/20 rounded-full">
              <svg
                className="w-6 h-6 text-info dark:text-blue-400"
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
        <div className="panel p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Student Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Active</span>
              <div className="flex items-center space-x-2">
                <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-success dark:bg-green-400 h-2 rounded-full transition-all"
                    style={{ width: `${data.students.total > 0 ? (data.students.active / data.students.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="font-semibold text-gray-900 dark:text-white w-12 text-right">{data.students.active}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Completed</span>
              <div className="flex items-center space-x-2">
                <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-info dark:bg-blue-400 h-2 rounded-full transition-all"
                    style={{ width: `${data.students.total > 0 ? (data.students.completed / data.students.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="font-semibold text-gray-900 dark:text-white w-12 text-right">{data.students.completed}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Dropped</span>
              <div className="flex items-center space-x-2">
                <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-error dark:bg-red-400 h-2 rounded-full transition-all"
                    style={{ width: `${data.students.total > 0 ? (data.students.dropped / data.students.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="font-semibold text-gray-900 dark:text-white w-12 text-right">{data.students.dropped}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="panel p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Paid</span>
              <div className="flex items-center space-x-2">
                <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-success dark:bg-green-400 h-2 rounded-full transition-all"
                    style={{ width: `${data.students.total > 0 ? (data.financial.paymentBreakdown.paid / data.students.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="font-semibold text-gray-900 dark:text-white w-12 text-right">{data.financial.paymentBreakdown.paid}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Partial</span>
              <div className="flex items-center space-x-2">
                <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-info dark:bg-blue-400 h-2 rounded-full transition-all"
                    style={{ width: `${data.students.total > 0 ? (data.financial.paymentBreakdown.partial / data.students.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="font-semibold text-gray-900 dark:text-white w-12 text-right">{data.financial.paymentBreakdown.partial}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Overdue</span>
              <div className="flex items-center space-x-2">
                <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-error dark:bg-red-400 h-2 rounded-full transition-all"
                    style={{ width: `${data.students.total > 0 ? (data.financial.paymentBreakdown.overdue / data.students.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="font-semibold text-gray-900 dark:text-white w-12 text-right">{data.financial.paymentBreakdown.overdue}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Revenue Breakdown */}
      <div className="panel p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Revenue (Last 6 Months)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Month
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  EUR
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  INR
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total (EUR)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.financial.monthlyRevenue.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {item.month} {item.year}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                    {formatCurrency(item.revenueEur, 'EUR')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                    {item.revenueInr > 0 ? (
                      <span>
                        {formatCurrency(item.revenueInr, 'INR')}
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                          (€{item.revenueInrEurEquivalent.toFixed(2)})
                        </span>
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-success dark:text-green-400">
                    {formatCurrency(item.revenueCombined, 'EUR')}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 dark:bg-gray-800 font-semibold">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  Total (All Time)
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                  {formatCurrency(data.financial.totalRevenueEur, 'EUR')}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                  {data.financial.totalRevenueInr > 0 ? (
                    <span>
                      {formatCurrency(data.financial.totalRevenueInr, 'INR')}
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                        (€{data.financial.totalRevenueInrEurEquivalent.toFixed(2)})
                      </span>
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-success dark:text-green-400">
                  {formatCurrency(data.financial.totalRevenueCombined, 'EUR')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          Monthly breakdown based on actual payment dates. INR amounts converted to EUR at 104.5 rate.
        </p>
      </div>

      {/* Churn Risk Alert */}
      {data.churnRisk.high > 0 && (
        <div className="bg-error/10 dark:bg-error/20 border border-error dark:border-red-400 p-4 rounded-md">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-error dark:text-red-400">⚠️ High Churn Risk Alert</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                {data.churnRisk.high} student(s) at high risk of dropping out.
                Review attendance and engagement immediately.
              </p>
            </div>
            <Link
              href="/dashboard/students?churnRisk=HIGH"
              className="px-4 py-2 bg-error dark:bg-red-500 text-white rounded-md hover:bg-error/90 dark:hover:bg-red-600 transition-colors"
            >
              View Students
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="panel p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/dashboard/students/new"
            className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary dark:hover:border-red-400 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors text-left"
          >
            <h3 className="font-medium text-gray-900 dark:text-white">Add New Student</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Enroll a new student</p>
          </Link>
          <Link
            href="/dashboard/attendance/bulk"
            className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary dark:hover:border-red-400 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors text-left"
          >
            <h3 className="font-medium text-gray-900 dark:text-white">Mark Attendance</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Record today&apos;s attendance</p>
          </Link>
          <Link
            href="/dashboard/payments/new"
            className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary dark:hover:border-red-400 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors text-left"
          >
            <h3 className="font-medium text-gray-900 dark:text-white">Record Payment</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Log a new payment</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
