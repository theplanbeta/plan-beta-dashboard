"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

type Student = {
  id: string
  name: string
  whatsapp: string
  email: string | null
  enrollmentType: string
  currentLevel: string
  batchId: string | null
  originalPrice: number
  discountApplied: number
  totalPaid: number
  paymentStatus: string
  referralSource: string
  trialAttended: boolean
  completionStatus: string
  notes: string | null
}

type Batch = {
  id: string
  batchCode: string
  level: string
}

export default function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [student, setStudent] = useState<Student | null>(null)
  const [batches, setBatches] = useState<Batch[]>([])

  const [formData, setFormData] = useState({
    name: "",
    whatsapp: "",
    email: "",
    enrollmentType: "A1_ONLY",
    currentLevel: "NEW",
    batchId: "",
    originalPrice: 0,
    discountApplied: 0,
    totalPaid: 0,
    paymentStatus: "PENDING",
    referralSource: "ORGANIC",
    trialAttended: false,
    completionStatus: "ACTIVE",
    notes: "",
  })

  useEffect(() => {
    fetchStudent()
    fetchBatches()
  }, [id])

  const fetchBatches = async () => {
    try {
      const res = await fetch("/api/batches")
      const data = await res.json()
      setBatches(data)
    } catch (error) {
      console.error("Error fetching batches:", error)
    }
  }

  const fetchStudent = async () => {
    try {
      const res = await fetch(`/api/students/${id}`)
      if (!res.ok) throw new Error("Failed to fetch student")

      const data = await res.json()
      setStudent(data)
      setFormData({
        name: data.name,
        whatsapp: data.whatsapp,
        email: data.email || "",
        enrollmentType: data.enrollmentType,
        currentLevel: data.currentLevel,
        batchId: data.batchId || "",
        originalPrice: Number(data.originalPrice),
        discountApplied: Number(data.discountApplied),
        totalPaid: Number(data.totalPaid),
        paymentStatus: data.paymentStatus,
        referralSource: data.referralSource,
        trialAttended: data.trialAttended,
        completionStatus: data.completionStatus,
        notes: data.notes || "",
      })
    } catch (err) {
      setError("Failed to load student")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const res = await fetch(`/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error("Failed to update student")

      router.push("/dashboard/students")
      router.refresh()
    } catch (err) {
      setError("Failed to update student. Please try again.")
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "number"
          ? parseFloat(value) || 0
          : type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading student...</div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-error">Student not found</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Student</h1>
          <p className="mt-2 text-gray-600">Update student information</p>
        </div>
        <Link
          href="/dashboard/students"
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

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp Number <span className="text-error">*</span>
              </label>
              <input
                type="text"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email (Optional)
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t pt-6">
          <h2 className="text-lg font-semibold text-foreground">Enrollment Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enrollment Type
              </label>
              <select
                name="enrollmentType"
                value={formData.enrollmentType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="A1_ONLY">A1 Only</option>
                <option value="FOUNDATION_A1_A2">Foundation (A1 + A2)</option>
                <option value="CAREER_A1_A2_B1">Career (A1 + A2 + B1)</option>
                <option value="COMPLETE_PATHWAY">Complete Pathway</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Level
              </label>
              <select
                name="currentLevel"
                value={formData.currentLevel}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="NEW">New</option>
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign to Batch (Optional)
              </label>
              <select
                name="batchId"
                value={formData.batchId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">No Batch</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batchCode} (Level {batch.level})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referral Source
              </label>
              <select
                name="referralSource"
                value={formData.referralSource}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="META_ADS">Meta Ads</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="GOOGLE">Google</option>
                <option value="ORGANIC">Organic</option>
                <option value="REFERRAL">Referral</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Completion Status
              </label>
              <select
                name="completionStatus"
                value={formData.completionStatus}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="DROPPED">Dropped</option>
                <option value="ON_HOLD">On Hold</option>
              </select>
            </div>

            <div className="flex items-center pt-8">
              <input
                type="checkbox"
                name="trialAttended"
                checked={formData.trialAttended}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, trialAttended: e.target.checked }))
                }
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label className="ml-2 text-sm text-gray-700">Trial Attended</label>
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t pt-6">
          <h2 className="text-lg font-semibold text-foreground">Pricing & Payment</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Original Price (€)
              </label>
              <input
                type="number"
                name="originalPrice"
                value={formData.originalPrice}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount (€)
              </label>
              <input
                type="number"
                name="discountApplied"
                value={formData.discountApplied}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Paid (€)
              </label>
              <input
                type="number"
                name="totalPaid"
                value={formData.totalPaid}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Final Price:</span>
              <span className="font-semibold">
                €{(formData.originalPrice - formData.discountApplied).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-600">Balance Remaining:</span>
              <span className="font-semibold text-warning">
                €
                {(
                  formData.originalPrice -
                  formData.discountApplied -
                  formData.totalPaid
                ).toFixed(2)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Status
            </label>
            <select
              name="paymentStatus"
              value={formData.paymentStatus}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="PENDING">Pending</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
        </div>

        <div className="border-t pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex justify-end space-x-4 border-t pt-6">
          <Link
            href="/dashboard/students"
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  )
}
