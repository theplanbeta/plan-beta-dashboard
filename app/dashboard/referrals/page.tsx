"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"

type Referral = {
  id: string
  referralDate: string
  enrollmentDate: string | null
  month1Complete: boolean
  payoutAmount: number
  payoutStatus: string
  payoutDate: string | null
  referrer: {
    id: string
    studentId: string
    name: string
    whatsapp: string
  }
  referee: {
    id: string
    studentId: string
    name: string
    whatsapp: string
    enrollmentDate: string
    attendanceRate: number
    completionStatus: string
  }
}

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [payoutFilter, setPayoutFilter] = useState("")
  const [month1Filter, setMonth1Filter] = useState("")

  useEffect(() => {
    fetchReferrals()
  }, [payoutFilter, month1Filter])

  const fetchReferrals = async () => {
    try {
      const params = new URLSearchParams()
      if (payoutFilter) params.append("payoutStatus", payoutFilter)
      if (month1Filter) params.append("month1Complete", month1Filter)

      const res = await fetch(`/api/referrals?${params.toString()}`)
      const data = await res.json()
      setReferrals(data)
    } catch (error) {
      console.error("Error fetching referrals:", error)
    } finally {
      setLoading(false)
    }
  }

  const getPayoutBadge = (status: string) => {
    const colors = {
      PENDING: "bg-warning/10 text-warning",
      PROCESSING: "bg-info/10 text-info",
      PAID: "bg-success/10 text-success",
      FAILED: "bg-error/10 text-error",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  // Calculate stats
  const totalReferrals = referrals.length
  const completedMonth1 = referrals.filter((r) => r.month1Complete).length
  const pendingPayouts = referrals.filter((r) => r.payoutStatus === "PENDING").length
  const totalPayouts = referrals
    .filter((r) => r.payoutStatus === "PAID")
    .reduce((sum, r) => sum + Number(r.payoutAmount), 0)
  const pendingPayoutAmount = referrals
    .filter((r) => r.payoutStatus === "PENDING" && r.month1Complete)
    .reduce((sum, r) => sum + Number(r.payoutAmount), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading referrals...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Referral Program</h1>
          <p className="mt-2 text-gray-600">Track referrals and manage payouts</p>
        </div>
        <Link
          href="/dashboard/referrals/new"
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
        >
          + Add Referral
        </Link>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Referrals</div>
          <div className="text-2xl font-bold text-foreground mt-1">{totalReferrals}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Month 1 Complete</div>
          <div className="text-2xl font-bold text-success mt-1">{completedMonth1}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Pending Payouts</div>
          <div className="text-2xl font-bold text-warning mt-1">{pendingPayouts}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Paid Out</div>
          <div className="text-2xl font-bold text-success mt-1">
            {formatCurrency(totalPayouts)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Pending Amount</div>
          <div className="text-2xl font-bold text-info mt-1">
            {formatCurrency(pendingPayoutAmount)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payout Status
            </label>
            <select
              value={payoutFilter}
              onChange={(e) => setPayoutFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Month 1 Status
            </label>
            <select
              value={month1Filter}
              onChange={(e) => setMonth1Filter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All</option>
              <option value="true">Completed</option>
              <option value="false">In Progress</option>
            </select>
          </div>
        </div>
      </div>

      {/* Referrals Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Referrer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Referee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Referral Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Month 1
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payout
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No referrals found
                  </td>
                </tr>
              ) : (
                referrals.map((referral) => (
                  <tr key={referral.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/dashboard/students/${referral.referrer.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {referral.referrer.name}
                      </Link>
                      <div className="text-xs text-gray-500">{referral.referrer.studentId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/dashboard/students/${referral.referee.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {referral.referee.name}
                      </Link>
                      <div className="text-xs text-gray-500">{referral.referee.studentId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(referral.referralDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${
                        Number(referral.referee.attendanceRate) >= 50 ? "text-success" : "text-error"
                      }`}>
                        {Number(referral.referee.attendanceRate).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {referral.month1Complete ? (
                        <span className="px-2 py-1 rounded text-xs bg-success/10 text-success">
                          ✓ Complete
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                          In Progress
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                      {formatCurrency(Number(referral.payoutAmount))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs ${getPayoutBadge(referral.payoutStatus)}`}>
                        {referral.payoutStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/dashboard/referrals/${referral.id}`}
                        className="text-primary hover:underline"
                      >
                        View
                      </Link>
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
