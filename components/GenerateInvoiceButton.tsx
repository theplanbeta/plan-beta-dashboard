"use client"

import { useState, useEffect } from "react"
import { downloadInvoice, generateInvoiceJPG, type InvoiceData } from "@/lib/invoice-generator"

interface GenerateInvoiceButtonProps {
  studentId: string
  paymentId?: string
  variant?: "primary" | "secondary" | "outline"
  showPreview?: boolean // kept for backwards compatibility
  children?: React.ReactNode
}

export function GenerateInvoiceButton({
  studentId,
  paymentId,
  variant = "primary",
  children,
}: GenerateInvoiceButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
  const [editForm, setEditForm] = useState({
    studentName: "",
    studentAddress: "",
    studentGst: "",
    studentEmail: "",
    studentPhone: "",
    currency: "EUR" as "EUR" | "INR",
    amount: 0,
    payableNow: 0,
    remainingAmount: 0,
  })

  const fetchInvoiceData = async () => {
    try {
      setLoading(true)
      setError("")

      const res = await fetch("/api/invoices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, paymentId }),
      })

      if (!res.ok) throw new Error("Failed to fetch invoice data")

      const { invoiceData: data } = await res.json()
      setInvoiceData(data)
      setEditForm({
        studentName: data.studentName || "",
        studentAddress: data.studentAddress || "",
        studentGst: data.studentGst || "",
        studentEmail: data.studentEmail || "",
        studentPhone: data.studentPhone || "",
        currency: data.currency || "EUR",
        amount: data.items?.[0]?.amount || 0,
        payableNow: data.payableNow || 0,
        remainingAmount: data.remainingAmount || 0,
      })
      setShowModal(true)
    } catch (err: any) {
      setError(err.message || "Failed to load invoice data")
    } finally {
      setLoading(false)
    }
  }

  const buildFinalData = (): InvoiceData => {
    if (!invoiceData) throw new Error("No invoice data")
    return {
      ...invoiceData,
      currency: editForm.currency,
      studentName: editForm.studentName,
      studentAddress: editForm.studentAddress || undefined,
      studentGst: editForm.studentGst || undefined,
      studentEmail: editForm.studentEmail,
      studentPhone: editForm.studentPhone,
      items: invoiceData.items.map((item, i) =>
        i === 0 ? { ...item, amount: editForm.amount } : item
      ),
      payableNow: editForm.payableNow,
      remainingAmount: editForm.remainingAmount,
    }
  }

  const handleDownloadPDF = async () => {
    try {
      setLoading(true)
      await downloadInvoice(buildFinalData())
      setShowModal(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadJPG = async () => {
    try {
      setLoading(true)
      await generateInvoiceJPG(buildFinalData())
      setShowModal(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const variantClasses = {
    primary: "bg-primary text-white hover:bg-primary-dark disabled:opacity-50",
    secondary: "bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50",
    outline: "border-2 border-primary text-primary hover:bg-primary hover:text-white disabled:opacity-50",
  }

  return (
    <div>
      <button
        onClick={fetchInvoiceData}
        disabled={loading}
        className={`px-4 py-2 rounded-md font-medium transition-colors ${variantClasses[variant]}`}
      >
        {loading ? "Loading..." : children || "Generate Invoice"}
      </button>

      {error && <p className="text-sm text-error mt-2">{error}</p>}

      {/* Editable Invoice Modal */}
      {showModal && invoiceData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Review Invoice</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Invoice number */}
              <div className="text-sm text-gray-500">
                Invoice #{invoiceData.invoiceNumber} &middot; {invoiceData.date}
              </div>

              {/* Student Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Bill To</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Name</label>
                    <input
                      type="text"
                      value={editForm.studentName}
                      onChange={(e) => setEditForm({ ...editForm, studentName: e.target.value })}
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Email</label>
                    <input
                      type="email"
                      value={editForm.studentEmail}
                      onChange={(e) => setEditForm({ ...editForm, studentEmail: e.target.value })}
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Phone</label>
                    <input
                      type="text"
                      value={editForm.studentPhone}
                      onChange={(e) => setEditForm({ ...editForm, studentPhone: e.target.value })}
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">GST Number</label>
                    <input
                      type="text"
                      value={editForm.studentGst}
                      onChange={(e) => setEditForm({ ...editForm, studentGst: e.target.value })}
                      placeholder="e.g. 32ABCDE1234F1ZP"
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-foreground"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500">Address</label>
                    <textarea
                      value={editForm.studentAddress}
                      onChange={(e) => setEditForm({ ...editForm, studentAddress: e.target.value })}
                      rows={2}
                      placeholder="Billing address"
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Amount & Currency */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Payment</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Currency</label>
                    <select
                      value={editForm.currency}
                      onChange={(e) => setEditForm({ ...editForm, currency: e.target.value as "EUR" | "INR" })}
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-foreground"
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="INR">INR (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Course Fee ({editForm.currency === "EUR" ? "€" : "₹"})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.amount}
                      onChange={(e) => {
                        const amount = parseFloat(e.target.value) || 0
                        setEditForm({ ...editForm, amount, remainingAmount: amount - editForm.payableNow })
                      }}
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Payable Now</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.payableNow}
                      onChange={(e) => {
                        const payableNow = parseFloat(e.target.value) || 0
                        setEditForm({ ...editForm, payableNow, remainingAmount: editForm.amount - payableNow })
                      }}
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Remaining</label>
                    <input
                      type="number"
                      value={editForm.remainingAmount}
                      readOnly
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-900 text-foreground cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadJPG}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "..." : "Download JPG"}
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={loading}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50"
              >
                {loading ? "Generating..." : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
