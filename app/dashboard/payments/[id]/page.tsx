"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatCurrency, formatDate } from "@/lib/utils"

type Payment = {
  id: string
  amount: number
  method: string
  paymentDate: string
  status: string
  transactionId: string | null
  notes: string | null
  student: {
    id: string
    studentId: string
    name: string
    whatsapp: string
    email: string | null
    finalPrice: number
    totalPaid: number
    balance: number
    batch: {
      id: string
      batchCode: string
    } | null
  }
}

export default function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchPayment()
  }, [id])

  const fetchPayment = async () => {
    try {
      const res = await fetch(`/api/payments/${id}`)
      if (!res.ok) throw new Error("Failed to fetch payment")

      const data = await res.json()
      setPayment(data)
    } catch (error) {
      console.error("Error fetching payment:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this payment? This action cannot be undone.")) {
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/payments/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete payment")

      router.push("/dashboard/payments")
      router.refresh()
    } catch (error) {
      console.error("Error deleting payment:", error)
      alert("Failed to delete payment")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading payment...</div>
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-error">Payment not found</div>
      </div>
    )
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold text-foreground">Payment Details</h1>
            <span className={`px-3 py-1 rounded-full text-sm ${getStatusBadge(payment.status)}`}>
              {payment.status}
            </span>
          </div>
          <p className="mt-2 text-gray-600">
            {formatCurrency(Number(payment.amount))} • {formatDate(payment.paymentDate)}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 border border-error text-error rounded-md hover:bg-error hover:text-white disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
          <Link
            href="/dashboard/payments"
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back
          </Link>
        </div>
      </div>

      {/* Payment Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Payment Information</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-600">Amount</div>
                <div className="text-2xl font-bold text-foreground mt-1">
                  {formatCurrency(Number(payment.amount))}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Payment Date</div>
                <div className="text-lg font-medium mt-1">{formatDate(payment.paymentDate)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Payment Method</div>
                <div className="mt-1">
                  <span className={`px-3 py-1 rounded text-sm ${getMethodBadge(payment.method)}`}>
                    {payment.method.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Status</div>
                <div className="mt-1">
                  <span className={`px-3 py-1 rounded text-sm ${getStatusBadge(payment.status)}`}>
                    {payment.status}
                  </span>
                </div>
              </div>
              {payment.transactionId && (
                <div className="col-span-2">
                  <div className="text-sm text-gray-600">Transaction ID</div>
                  <div className="font-mono text-sm mt-1">{payment.transactionId}</div>
                </div>
              )}
            </div>

            {payment.notes && (
              <div className="mt-6 pt-6 border-t">
                <div className="text-sm text-gray-600 mb-1">Notes</div>
                <div className="text-sm">{payment.notes}</div>
              </div>
            )}
          </div>
        </div>

        {/* Student Info Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-foreground mb-4">Student Information</h3>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Name</div>
                <Link
                  href={`/dashboard/students/${payment.student.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {payment.student.name}
                </Link>
              </div>
              <div>
                <div className="text-sm text-gray-600">Student ID</div>
                <div className="font-medium">{payment.student.studentId}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">WhatsApp</div>
                <div className="font-medium">{payment.student.whatsapp}</div>
              </div>
              {payment.student.email && (
                <div>
                  <div className="text-sm text-gray-600">Email</div>
                  <div className="font-medium text-sm">{payment.student.email}</div>
                </div>
              )}
              {payment.student.batch && (
                <div>
                  <div className="text-sm text-gray-600">Batch</div>
                  <Link
                    href={`/dashboard/batches/${payment.student.batch.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {payment.student.batch.batchCode}
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-foreground mb-4">Payment Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount</span>
                <span className="font-medium">{formatCurrency(Number(payment.student.finalPrice))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Paid</span>
                <span className="font-medium text-success">
                  {formatCurrency(Number(payment.student.totalPaid))}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="font-semibold">Balance</span>
                <span className="font-semibold text-warning">
                  {formatCurrency(Number(payment.student.balance))}
                </span>
              </div>
            </div>

            {payment.student.balance > 0 && (
              <Link
                href={`/dashboard/payments/new?studentId=${payment.student.id}`}
                className="mt-4 block w-full px-4 py-2 bg-primary text-white text-center rounded-md hover:bg-primary-dark"
              >
                Record Another Payment
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
