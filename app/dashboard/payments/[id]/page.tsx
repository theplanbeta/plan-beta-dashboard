"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatCurrency, formatDate } from "@/lib/utils"
import { generateReceiptPDF, generateReceiptJPGBlob } from "@/lib/receipt-generator"
import type { ReceiptData } from "@/lib/receipt-types"

type Payment = {
  id: string
  amount: number
  method: string
  currency: string
  paymentDate: string
  status: string
  transactionId: string | null
  invoiceNumber: string | null
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
  const [generatingReceipt, setGeneratingReceipt] = useState(false)
  const [existingReceipt, setExistingReceipt] = useState<any>(null)
  const [showReceiptForm, setShowReceiptForm] = useState(false)
  const [receiptFormData, setReceiptFormData] = useState<any>(null)
  const [deletingReceipt, setDeletingReceipt] = useState(false)

  useEffect(() => {
    fetchPayment()
  }, [id])

  const fetchPayment = async () => {
    try {
      const res = await fetch(`/api/payments/${id}`)
      if (!res.ok) throw new Error("Failed to fetch payment")

      const data = await res.json()
      setPayment(data)

      // Check if receipt exists for this payment
      const receiptRes = await fetch(`/api/receipts?paymentId=${id}`)
      if (receiptRes.ok) {
        const receipts = await receiptRes.json()
        if (receipts.length > 0) {
          setExistingReceipt(receipts[0])
        }
      }
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

  const handleGenerateReceipt = async () => {
    if (!payment) return

    if (existingReceipt) {
      alert(`Receipt already exists: ${existingReceipt.receiptNumber}`)
      return
    }

    // Extract level from batch code (e.g., "A2-OCT-MOR-01" -> "A2")
    const batchCode = payment.student.batch?.batchCode || ''
    const level = batchCode ? batchCode.split('-')[0] : 'N/A'

    // Prepare receipt data with auto-populated values
    const initialData = {
      date: formatDate(payment.paymentDate),
      currency: payment.currency === 'EUR' ? 'EUR' : 'INR',
      studentName: payment.student.name,
      studentEmail: payment.student.email || '',
      studentPhone: payment.student.whatsapp,
      level: level,
      description: `German Language Course - ${batchCode || 'Course'}`,
      month: new Date(payment.paymentDate).toLocaleDateString('en-US', { month: 'long' }),
      batch: batchCode || 'N/A',
      amount: Number(payment.student.finalPrice),
      amountPaid: Number(payment.amount),
      totalAmount: Number(payment.student.finalPrice),
      balanceRemaining: Number(payment.student.balance),
      paymentMethod: payment.method.replace(/_/g, ' '),
      transactionReference: payment.transactionId || '',
      invoiceNumber: payment.invoiceNumber || ''
    }

    setReceiptFormData(initialData)
    setShowReceiptForm(true)
  }

  const handleConfirmGenerateReceipt = async () => {
    if (!payment || !receiptFormData) return

    setGeneratingReceipt(true)

    try {
      // STEP 1: Get the real receipt number from server
      const initRes = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: payment.id,
          initializeOnly: true
        })
      })

      if (!initRes.ok) {
        const error = await initRes.json()
        throw new Error(error.error || 'Failed to initialize receipt')
      }

      const initResult = await initRes.json()

      if (initResult.alreadyExists) {
        alert(`Receipt already exists: ${initResult.receiptNumber}`)
        setShowReceiptForm(false)
        fetchPayment()
        return
      }

      const realReceiptNumber = initResult.receiptNumber

      // STEP 2: Generate PDF/JPG with the REAL receipt number
      const receiptData: ReceiptData = {
        receiptNumber: realReceiptNumber, // Use the real receipt number
        date: receiptFormData.date,
        currency: receiptFormData.currency as 'EUR' | 'INR',
        studentName: receiptFormData.studentName,
        studentEmail: receiptFormData.studentEmail || undefined,
        studentPhone: receiptFormData.studentPhone,
        items: [{
          level: receiptFormData.level,
          description: receiptFormData.description,
          month: receiptFormData.month,
          batch: receiptFormData.batch,
          amount: Number(receiptFormData.amount)
        }],
        amountPaid: Number(receiptFormData.amountPaid),
        totalAmount: Number(receiptFormData.totalAmount),
        balanceRemaining: Number(receiptFormData.balanceRemaining),
        paymentMethod: receiptFormData.paymentMethod as any,
        transactionReference: receiptFormData.transactionReference || undefined,
        paymentStatus: receiptFormData.balanceRemaining > 0 ? 'PARTIAL_PAYMENT' : 'PAID_IN_FULL',
        invoiceNumber: receiptFormData.invoiceNumber || undefined
      }

      // Generate PDF
      const pdfDoc = await generateReceiptPDF(receiptData)
      const pdfBlob = pdfDoc.output('blob')
      const pdfBase64 = await blobToBase64(pdfBlob)

      // Generate JPG
      const jpgBlob = await generateReceiptJPGBlob(receiptData)
      const jpgBase64 = await blobToBase64(jpgBlob)

      // STEP 3: Send files to server to complete the receipt
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: payment.id,
          pdfBase64: pdfBase64.split(',')[1], // Remove data:application/pdf;base64, prefix
          jpgBase64: jpgBase64.split(',')[1]  // Remove data:image/jpeg;base64, prefix
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to generate receipt')
      }

      const result = await res.json()
      alert(`Receipt generated successfully!\nReceipt Number: ${result.receipt.receiptNumber}`)

      // Close form and refresh
      setShowReceiptForm(false)
      fetchPayment()
    } catch (error) {
      console.error('Error generating receipt:', error)
      alert('Failed to generate receipt: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setGeneratingReceipt(false)
    }
  }

  const handleDownloadReceipt = async (format: 'pdf' | 'jpg') => {
    if (!existingReceipt) return

    try {
      const url = `/api/receipts/${existingReceipt.id}/download?format=${format}`
      window.open(url, '_blank')
    } catch (error) {
      console.error('Error downloading receipt:', error)
      alert('Failed to download receipt')
    }
  }

  const handleDeleteReceipt = async () => {
    if (!existingReceipt) return

    if (!confirm(`Are you sure you want to delete receipt ${existingReceipt.receiptNumber}? This action cannot be undone.`)) {
      return
    }

    setDeletingReceipt(true)
    try {
      const res = await fetch(`/api/receipts/${existingReceipt.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete receipt')
      }

      alert('Receipt deleted successfully')
      setExistingReceipt(null)
      fetchPayment()
    } catch (error) {
      console.error('Error deleting receipt:', error)
      alert('Failed to delete receipt: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setDeletingReceipt(false)
    }
  }

  // Helper function to convert Blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
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
      {/* Receipt Form Modal */}
      {showReceiptForm && receiptFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Review Receipt Details</h2>
              <button
                onClick={() => setShowReceiptForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Student Information */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Student Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Student Name *
                    </label>
                    <input
                      type="text"
                      value={receiptFormData.studentName}
                      onChange={(e) => setReceiptFormData({ ...receiptFormData, studentName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Student Email
                    </label>
                    <input
                      type="email"
                      value={receiptFormData.studentEmail}
                      onChange={(e) => setReceiptFormData({ ...receiptFormData, studentEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Student Phone *
                    </label>
                    <input
                      type="text"
                      value={receiptFormData.studentPhone}
                      onChange={(e) => setReceiptFormData({ ...receiptFormData, studentPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Payment Date *
                    </label>
                    <input
                      type="text"
                      value={receiptFormData.date}
                      onChange={(e) => setReceiptFormData({ ...receiptFormData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Course Information */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Course Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Level *
                    </label>
                    <input
                      type="text"
                      value={receiptFormData.level}
                      onChange={(e) => setReceiptFormData({ ...receiptFormData, level: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Batch *
                    </label>
                    <input
                      type="text"
                      value={receiptFormData.batch}
                      onChange={(e) => setReceiptFormData({ ...receiptFormData, batch: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Month *
                    </label>
                    <input
                      type="text"
                      value={receiptFormData.month}
                      onChange={(e) => setReceiptFormData({ ...receiptFormData, month: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-foreground"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Course Description *
                    </label>
                    <input
                      type="text"
                      value={receiptFormData.description}
                      onChange={(e) => setReceiptFormData({ ...receiptFormData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Payment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Currency *
                    </label>
                    <select
                      value={receiptFormData.currency}
                      onChange={(e) => setReceiptFormData({ ...receiptFormData, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-foreground"
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="INR">INR (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Payment Method *
                    </label>
                    <input
                      type="text"
                      value={receiptFormData.paymentMethod}
                      onChange={(e) => setReceiptFormData({ ...receiptFormData, paymentMethod: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Amount Paid *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={receiptFormData.amountPaid}
                      onChange={(e) => {
                        const amountPaid = parseFloat(e.target.value) || 0
                        setReceiptFormData({
                          ...receiptFormData,
                          amountPaid,
                          balanceRemaining: receiptFormData.totalAmount - amountPaid
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Total Course Fee *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={receiptFormData.totalAmount}
                      onChange={(e) => {
                        const totalAmount = parseFloat(e.target.value) || 0
                        setReceiptFormData({
                          ...receiptFormData,
                          totalAmount,
                          balanceRemaining: totalAmount - receiptFormData.amountPaid
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Balance Remaining * (Auto-calculated)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={receiptFormData.balanceRemaining}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-900 text-foreground cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Transaction Reference
                    </label>
                    <input
                      type="text"
                      value={receiptFormData.transactionReference}
                      onChange={(e) => setReceiptFormData({ ...receiptFormData, transactionReference: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Invoice Number
                    </label>
                    <input
                      type="text"
                      value={receiptFormData.invoiceNumber}
                      onChange={(e) => setReceiptFormData({ ...receiptFormData, invoiceNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-foreground"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowReceiptForm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmGenerateReceipt}
                disabled={generatingReceipt}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingReceipt ? "Generating..." : "Generate Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}

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
          {!existingReceipt ? (
            <button
              onClick={handleGenerateReceipt}
              disabled={generatingReceipt}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingReceipt ? "Generating..." : "Generate Receipt"}
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={() => handleDownloadReceipt('pdf')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Download PDF
              </button>
              <button
                onClick={() => handleDownloadReceipt('jpg')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Download JPG
              </button>
            </div>
          )}
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

      {/* Receipt Info Banner */}
      {existingReceipt && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-semibold">✓ Receipt Generated</span>
                <span className="text-gray-600">•</span>
                <span className="font-mono text-sm">{existingReceipt.receiptNumber}</span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Created: {formatDate(existingReceipt.createdAt)} • Downloaded: {existingReceipt.downloadCount} times
              </div>
            </div>
            <button
              onClick={handleDeleteReceipt}
              disabled={deletingReceipt}
              className="px-3 py-1 border border-red-300 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {deletingReceipt ? "Deleting..." : "Delete Receipt"}
            </button>
          </div>
        </div>
      )}

      {/* Payment Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
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

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
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
