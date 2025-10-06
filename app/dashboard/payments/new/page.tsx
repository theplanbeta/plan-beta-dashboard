"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"


type Student = {
  id: string
  studentId: string
  name: string
  whatsapp: string
  finalPrice: number
  totalPaid: number
  balance: number
  paymentStatus: string
}

export default function NewPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentIdParam = searchParams.get("studentId")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  const [formData, setFormData] = useState({
    studentId: studentIdParam || "",
    amount: 0,
    method: "CASH",
    paymentDate: new Date().toISOString().split("T")[0],
    status: "COMPLETED",
    transactionId: "",
    notes: "",
  })

  useEffect(() => {
    fetchStudents()
  }, [])

  useEffect(() => {
    if (formData.studentId) {
      const student = students.find((s) => s.id === formData.studentId)
      setSelectedStudent(student || null)
    }
  }, [formData.studentId, students])

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/students")
      const data = await res.json()
      setStudents(data)

      // If studentId is passed, pre-select it
      if (studentIdParam) {
        const student = data.find((s: Student) => s.id === studentIdParam)
        if (student) {
          setSelectedStudent(student)
          setFormData((prev) => ({
            ...prev,
            studentId: student.id,
            amount: Number(student.balance),
          }))
        }
      }
    } catch (error) {
      console.error("Error fetching students:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        throw new Error("Failed to record payment")
      }

      router.push("/dashboard/payments")
      router.refresh()
    } catch (err) {
      setError("Failed to record payment. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }))
  }

  const handleStudentChange = (studentId: string) => {
    setFormData((prev) => ({ ...prev, studentId }))
    const student = students.find((s) => s.id === studentId)
    if (student) {
      setSelectedStudent(student)
      setFormData((prev) => ({
        ...prev,
        amount: Number(student.balance),
      }))
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Record Payment</h1>
          <p className="mt-2 text-gray-600">Add a new payment record</p>
        </div>
        <Link
          href="/dashboard/payments"
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {error && (
          <div className="bg-error/10 border border-error text-error px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Student Selection */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Student Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Student <span className="text-error">*</span>
            </label>
            <select
              name="studentId"
              value={formData.studentId}
              onChange={(e) => handleStudentChange(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Choose a student...</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.studentId}) - Balance: {formatCurrency(Number(student.balance))}
                </option>
              ))}
            </select>
          </div>

          {selectedStudent && (
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-semibold ml-2">
                    {formatCurrency(Number(selectedStudent.finalPrice))}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Paid:</span>
                  <span className="font-semibold ml-2 text-success">
                    {formatCurrency(Number(selectedStudent.totalPaid))}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Balance:</span>
                  <span className="font-semibold ml-2 text-warning">
                    {formatCurrency(Number(selectedStudent.balance))}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span className="font-semibold ml-2">
                    {selectedStudent.paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Payment Details */}
        <div className="space-y-4 border-t pt-6">
          <h2 className="text-lg font-semibold text-foreground">Payment Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (€) <span className="text-error">*</span>
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date <span className="text-error">*</span>
              </label>
              <input
                type="date"
                name="paymentDate"
                value={formData.paymentDate}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method <span className="text-error">*</span>
              </label>
              <select
                name="method"
                value={formData.method}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction ID (Optional)
              </label>
              <input
                type="text"
                name="transactionId"
                value={formData.transactionId}
                onChange={handleChange}
                placeholder="e.g., TXN123456789"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="border-t pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Any additional information about this payment..."
          />
        </div>

        {/* Remaining Balance Preview */}
        {selectedStudent && formData.amount > 0 && (
          <div className="bg-info/10 border border-info p-4 rounded-md">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Remaining Balance After Payment:</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(Number(selectedStudent.balance) - formData.amount)}
              </span>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end space-x-4 border-t pt-6">
          <Link
            href="/dashboard/payments"
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Recording..." : "Record Payment"}
          </button>
        </div>
      </form>
    </div>
  )
}
