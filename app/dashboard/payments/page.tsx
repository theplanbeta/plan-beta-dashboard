"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"

type Payment = {
  id: string
  amount: number
  method: string
  paymentDate: string
  status: string
  transactionId: string | null
  student: {
    id: string
    studentId: string
    name: string
    whatsapp: string
    batch: {
      id: string
      batchCode: string
    } | null
  }
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")
  const [methodFilter, setMethodFilter] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchPayments()
  }, [statusFilter, methodFilter])

  const fetchPayments = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append("status", statusFilter)
      if (methodFilter) params.append("method", methodFilter)

      const res = await fetch(`/api/payments?${params.toString()}`)
      const data = await res.json()
      setPayments(data)
    } catch (error) {
      console.error("Error fetching payments:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      COMPLETED: "bg-success/10 text-success",
      PENDING: "bg-warning/10 text-warning",
      FAILED: "bg-error/10 text-error",
      REFUNDED: "bg-info/10 text-info",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const getMethodBadge = (method: string) => {
    const colors = {
      CASH: "bg-green-100 text-green-800",
      BANK_TRANSFER: "bg-blue-100 text-blue-800",
      UPI: "bg-purple-100 text-purple-800",
      CARD: "bg-indigo-100 text-indigo-800",
      OTHER: "bg-gray-100 text-gray-800",
    }
    return colors[method as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  // Filter payments by search term
  const filteredPayments = payments.filter((payment) => {
    const search = searchTerm.toLowerCase()
    return (
      payment.student.name.toLowerCase().includes(search) ||
      payment.student.studentId.toLowerCase().includes(search) ||
      payment.transactionId?.toLowerCase().includes(search) ||
      payment.student.whatsapp.includes(search)
    )
  })

  // Calculate stats
  const totalRevenue = filteredPayments
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const pendingPayments = filteredPayments.filter((p) => p.status === "PENDING").length
  const completedPayments = filteredPayments.filter((p) => p.status === "COMPLETED").length
  const avgPayment =
    completedPayments > 0 ? totalRevenue / completedPayments : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading payments...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payments</h1>
          <p className="mt-2 text-gray-600">Track and manage student payments</p>
        </div>
        <Link
          href="/dashboard/payments/new"
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
        >
          + Record Payment
        </Link>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Revenue</div>
          <div className="text-2xl font-bold text-success mt-1">
            {formatCurrency(totalRevenue)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-2xl font-bold text-foreground mt-1">{completedPayments}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-2xl font-bold text-warning mt-1">{pendingPayments}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Avg Payment</div>
          <div className="text-2xl font-bold text-info mt-1">
            {formatCurrency(avgPayment)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Student name, ID, or transaction ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
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
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/dashboard/students/${payment.student.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {payment.student.name}
                      </Link>
                      <div className="text-xs text-gray-500">{payment.student.studentId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(Number(payment.amount))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs ${getMethodBadge(payment.method)}`}>
                        {payment.method.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.transactionId || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/dashboard/payments/${payment.id}`}
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
