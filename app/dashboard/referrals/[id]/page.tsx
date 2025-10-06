"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatCurrency, formatDate } from "@/lib/utils"

type Referral = {
  id: string
  referralDate: string
  enrollmentDate: string | null
  month1Complete: boolean
  payoutAmount: number
  payoutStatus: string
  payoutDate: string | null
  notes: string | null
  referrer: {
    id: string
    studentId: string
    name: string
    whatsapp: string
    email: string | null
  }
  referee: {
    id: string
    studentId: string
    name: string
    whatsapp: string
    email: string | null
    enrollmentDate: string
    attendanceRate: number
    classesAttended: number
    totalClasses: number
    completionStatus: string
  }
}

export default function ReferralDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [referral, setReferral] = useState<Referral | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchReferral()
  }, [id])

  const fetchReferral = async () => {
    try {
      const res = await fetch(`/api/referrals/${id}`)
      if (!res.ok) throw new Error("Failed to fetch referral")

      const data = await res.json()
      setReferral(data)
    } catch (error) {
      console.error("Error fetching referral:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleProcessPayout = async () => {
    if (!referral?.month1Complete) {
      alert("Cannot process payout: Month 1 not yet complete")
      return
    }

    if (!confirm(`Process payout of ${formatCurrency(Number(referral.payoutAmount))} to ${referral.referrer.name}?`)) {
      return
    }

    setUpdating(true)
    try {
      const res = await fetch(`/api/referrals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payoutStatus: "PAID",
          payoutDate: new Date().toISOString(),
        }),
      })

      if (!res.ok) throw new Error("Failed to process payout")

      await fetchReferral()
      alert("Payout processed successfully!")
    } catch (error) {
      console.error("Error processing payout:", error)
      alert("Failed to process payout")
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading referral...</div>
      </div>
    )
  }

  if (!referral) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-error">Referral not found</div>
      </div>
    )
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

  const attendanceRate = Number(referral.referee.attendanceRate)
  const eligible = attendanceRate >= 50 && referral.referee.classesAttended >= 4

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold text-foreground">Referral Details</h1>
            <span className={`px-3 py-1 rounded-full text-sm ${getPayoutBadge(referral.payoutStatus)}`}>
              {referral.payoutStatus}
            </span>
          </div>
          <p className="mt-2 text-gray-600">
            {formatCurrency(Number(referral.payoutAmount))} • {formatDate(referral.referralDate)}
          </p>
        </div>
        <div className="flex space-x-3">
          {referral.payoutStatus === "PENDING" && referral.month1Complete && (
            <button
              onClick={handleProcessPayout}
              disabled={updating}
              className="px-4 py-2 bg-success text-white rounded-md hover:bg-success/90 disabled:opacity-50"
            >
              {updating ? "Processing..." : "Process Payout"}
            </button>
          )}
          <Link
            href="/dashboard/referrals"
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back
          </Link>
        </div>
      </div>

      {/* Status Alert */}
      {!referral.month1Complete && (
        <div className={`p-4 rounded-md ${
          eligible ? "bg-success/10 border border-success" : "bg-warning/10 border border-warning"
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">
                {eligible ? "✓ Eligible for Payout" : "Month 1 In Progress"}
              </h3>
              <p className="text-sm mt-1">
                {eligible
                  ? "Referee has completed Month 1 with ≥50% attendance. Payout can be processed."
                  : `Current attendance: ${attendanceRate.toFixed(0)}% (${referral.referee.classesAttended}/${referral.referee.totalClasses} classes). Needs ≥50% to complete.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Referral Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Referral Information</h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-3">Referrer</div>
                <Link
                  href={`/dashboard/students/${referral.referrer.id}`}
                  className="font-medium text-lg text-primary hover:underline"
                >
                  {referral.referrer.name}
                </Link>
                <div className="text-sm text-gray-600 mt-1">{referral.referrer.studentId}</div>
                <div className="text-sm text-gray-600">{referral.referrer.whatsapp}</div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-3">Referee</div>
                <Link
                  href={`/dashboard/students/${referral.referee.id}`}
                  className="font-medium text-lg text-primary hover:underline"
                >
                  {referral.referee.name}
                </Link>
                <div className="text-sm text-gray-600 mt-1">{referral.referee.studentId}</div>
                <div className="text-sm text-gray-600">{referral.referee.whatsapp}</div>
              </div>

              <div>
                <div className="text-sm text-gray-600">Referral Date</div>
                <div className="font-medium mt-1">{formatDate(referral.referralDate)}</div>
              </div>

              <div>
                <div className="text-sm text-gray-600">Enrollment Date</div>
                <div className="font-medium mt-1">
                  {referral.enrollmentDate ? formatDate(referral.enrollmentDate) : "-"}
                </div>
              </div>
            </div>

            {referral.notes && (
              <div className="mt-6 pt-6 border-t">
                <div className="text-sm text-gray-600 mb-1">Notes</div>
                <div className="text-sm">{referral.notes}</div>
              </div>
            )}
          </div>

          {/* Referee Progress */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Referee Progress</h2>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600">Attendance Rate</div>
                <div className={`text-2xl font-bold mt-1 ${
                  attendanceRate >= 50 ? "text-success" : "text-error"
                }`}>
                  {attendanceRate.toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {referral.referee.classesAttended} / {referral.referee.totalClasses} classes
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600">Status</div>
                <div className="font-medium mt-1">{referral.referee.completionStatus}</div>
              </div>

              <div>
                <div className="text-sm text-gray-600">Enrolled Since</div>
                <div className="font-medium mt-1">{formatDate(referral.referee.enrollmentDate)}</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Progress to Month 1 Complete</span>
                <span className="font-medium">
                  {referral.month1Complete ? "100%" : `${Math.min((attendanceRate / 50) * 100, 100).toFixed(0)}%`}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    referral.month1Complete ? "bg-success" : attendanceRate >= 50 ? "bg-success" : "bg-warning"
                  }`}
                  style={{ width: `${referral.month1Complete ? 100 : Math.min((attendanceRate / 50) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payout Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-foreground mb-4">Payout Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount</span>
                <span className="font-semibold text-lg">{formatCurrency(Number(referral.payoutAmount))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className={`px-2 py-1 rounded text-xs ${getPayoutBadge(referral.payoutStatus)}`}>
                  {referral.payoutStatus}
                </span>
              </div>
              {referral.payoutDate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Paid On</span>
                  <span className="font-medium">{formatDate(referral.payoutDate)}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t">
                <span className="text-gray-600">Month 1</span>
                <span className={`font-medium ${referral.month1Complete ? "text-success" : "text-gray-500"}`}>
                  {referral.month1Complete ? "✓ Complete" : "In Progress"}
                </span>
              </div>
            </div>
          </div>

          {/* Eligibility Checklist */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-foreground mb-4">Payout Eligibility</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className={`text-lg ${attendanceRate >= 50 ? "text-success" : "text-gray-300"}`}>
                  {attendanceRate >= 50 ? "✓" : "○"}
                </span>
                <span className="text-sm">Attendance ≥50%</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-lg ${referral.referee.classesAttended >= 4 ? "text-success" : "text-gray-300"}`}>
                  {referral.referee.classesAttended >= 4 ? "✓" : "○"}
                </span>
                <span className="text-sm">Min 4 classes attended</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-lg ${referral.month1Complete ? "text-success" : "text-gray-300"}`}>
                  {referral.month1Complete ? "✓" : "○"}
                </span>
                <span className="text-sm">Month 1 complete</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
