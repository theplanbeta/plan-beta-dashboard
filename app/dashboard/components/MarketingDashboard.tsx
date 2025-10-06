"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

type MarketingData = {
  students: {
    total: number
    thisMonth: number
    bySource: Record<string, number>
    byEnrollmentType: Record<string, number>
  }
  referrals: {
    total: number
    completed: number
    pendingPayouts: number
  }
  batches: {
    filling: number
    planning: number
    seatsAvailable: number
  }
  leads: {
    total: number
    hot: number
    converted: number
    conversionRate: number
  }
}

export default function MarketingDashboard({ userName }: { userName: string }) {
  const [data, setData] = useState<MarketingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [studentsRes, referralsRes, batchesRes, leadsRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/referrals"),
        fetch("/api/batches"),
        fetch("/api/leads"),
      ])

      const students = await studentsRes.json()
      const referrals = await referralsRes.json()
      const batches = await batchesRes.json()
      const leads = await leadsRes.json()

      // Calculate stats
      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const thisMonthStudents = students.filter(
        (s: { enrollmentDate: string }) => new Date(s.enrollmentDate) >= thisMonthStart
      )

      const bySource: Record<string, number> = {}
      students.forEach((s: { referralSource: string }) => {
        bySource[s.referralSource] = (bySource[s.referralSource] || 0) + 1
      })

      const byEnrollmentType: Record<string, number> = {}
      students.forEach((s: { enrollmentType: string }) => {
        byEnrollmentType[s.enrollmentType] = (byEnrollmentType[s.enrollmentType] || 0) + 1
      })

      const fillingBatches = batches.filter((b: { status: string }) => b.status === 'FILLING')
      const planningBatches = batches.filter((b: { status: string }) => b.status === 'PLANNING')
      const seatsAvailable = batches.reduce(
        (sum: number, b: { totalSeats: number; enrolledCount: number }) =>
          sum + (b.totalSeats - b.enrolledCount),
        0
      )

      const hotLeads = leads.filter((l: { quality: string; converted: boolean }) => l.quality === 'HOT' && !l.converted)
      const convertedLeads = leads.filter((l: { converted: boolean }) => l.converted)
      const conversionRate = leads.length > 0 ? (convertedLeads.length / leads.length) * 100 : 0

      setData({
        students: {
          total: students.length,
          thisMonth: thisMonthStudents.length,
          bySource,
          byEnrollmentType,
        },
        referrals: {
          total: referrals.length,
          completed: referrals.filter((r: { month1Complete: boolean }) => r.month1Complete).length,
          pendingPayouts: referrals.filter((r: { payoutStatus: string }) => r.payoutStatus === 'PENDING').length,
        },
        batches: {
          filling: fillingBatches.length,
          planning: planningBatches.length,
          seatsAvailable,
        },
        leads: {
          total: leads.length,
          hot: hotLeads.length,
          converted: convertedLeads.length,
          conversionRate,
        },
      })
    } catch (error) {
      console.error("Error fetching marketing data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Welcome back, {userName}!</h1>
        <p className="text-gray-600">Loading your metrics...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {userName}!</h1>
        <p className="mt-2 text-gray-600">Here&apos;s your marketing performance overview.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Total Leads</div>
          <div className="mt-2 text-3xl font-bold text-purple-600">{data.leads.total}</div>
          <div className="mt-1 text-sm text-gray-500">{data.leads.hot} hot leads</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Conversion Rate</div>
          <div className="mt-2 text-3xl font-bold text-success">{data.leads.conversionRate.toFixed(1)}%</div>
          <div className="mt-1 text-sm text-gray-500">{data.leads.converted} converted</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Total Students</div>
          <div className="mt-2 text-3xl font-bold text-primary">{data.students.total}</div>
          <div className="mt-1 text-sm text-gray-500">{data.students.thisMonth} this month</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Available Seats</div>
          <div className="mt-2 text-3xl font-bold text-warning">{data.batches.seatsAvailable}</div>
          <div className="mt-1 text-sm text-gray-500">across all batches</div>
        </div>
      </div>

      {/* Enrollment Sources */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-foreground">Enrollment Sources</h2>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {Object.entries(data.students.bySource)
              .sort(([, a], [, b]) => b - a)
              .map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    <span className="font-medium text-gray-700">
                      {source.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">{count} students</span>
                    <span className="text-sm font-semibold text-primary">
                      {((count / data.students.total) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Enrollment Types */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-foreground">Enrollment Types</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(data.students.byEnrollmentType).map(([type, count]) => (
              <div key={type} className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  {type.replace(/_/g, ' ')}
                </div>
                <div className="mt-2 text-2xl font-bold text-foreground">{count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <Link
          href="/dashboard/leads/new"
          className="bg-purple-600 text-white rounded-lg shadow p-6 hover:bg-purple-700 transition-colors"
        >
          <div className="text-lg font-semibold">Add New Lead</div>
          <div className="mt-2 text-sm opacity-90">
            Capture a new lead
          </div>
        </Link>

        <Link
          href="/dashboard/leads"
          className="bg-primary text-white rounded-lg shadow p-6 hover:bg-primary-dark transition-colors"
        >
          <div className="text-lg font-semibold">Manage Leads</div>
          <div className="mt-2 text-sm opacity-90">
            {data.leads.hot} hot leads to follow up
          </div>
        </Link>

        <Link
          href="/dashboard/referrals"
          className="bg-success text-white rounded-lg shadow p-6 hover:opacity-90 transition-opacity"
        >
          <div className="text-lg font-semibold">Manage Referrals</div>
          <div className="mt-2 text-sm opacity-90">
            {data.referrals.pendingPayouts} pending payouts
          </div>
        </Link>

        <Link
          href="/dashboard/insights"
          className="bg-white border-2 border-primary text-primary rounded-lg shadow p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="text-lg font-semibold">View Insights</div>
          <div className="mt-2 text-sm">
            Analytics & recommendations
          </div>
        </Link>
      </div>
    </div>
  )
}
