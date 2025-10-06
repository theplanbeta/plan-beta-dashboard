"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { COURSE_PRICING, type CourseLevel } from "@/lib/pricing"

type Lead = {
  id: string
  name: string
  whatsapp: string
  email: string | null
  source: string
  interestedLevel: string | null
  interestedType: string | null
  interestedBatch: {
    id: string
    batchCode: string
    level: string
  } | null
  converted: boolean
}

type Batch = {
  id: string
  batchCode: string
  level: string
  enrolledCount: number
  totalSeats: number
}

export default function ConvertLeadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState(false)
  const [formData, setFormData] = useState({
    batchId: "",
    enrollmentType: "",
    originalPrice: "",
    discountApplied: "0",
    trialAttended: true,
    currency: "EUR" as "EUR" | "INR",
  })

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      // Fetch lead
      const leadRes = await fetch(`/api/leads/${id}`)
      if (leadRes.ok) {
        const leadData = await leadRes.json()

        if (leadData.converted) {
          alert("This lead has already been converted")
          router.push(`/dashboard/leads/${id}`)
          return
        }

        setLead(leadData)

        // Pre-fill form data from lead
        setFormData({
          batchId: leadData.interestedBatch?.id || "",
          enrollmentType: leadData.interestedType || "",
          originalPrice: "",
          discountApplied: "0",
          trialAttended: leadData.trialAttendedDate !== null,
          currency: "EUR" as "EUR" | "INR",
        })
      } else {
        router.push("/dashboard/leads")
        return
      }

      // Fetch batches
      const batchRes = await fetch("/api/batches")
      const batchData = await batchRes.json()
      setBatches(batchData.filter((b: Batch) => b.enrolledCount < b.totalSeats))
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.batchId || !formData.enrollmentType || !formData.originalPrice) {
      alert("Please fill in all required fields")
      return
    }

    setConverting(true)

    try {
      const res = await fetch(`/api/leads/${id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: formData.batchId,
          enrollmentType: formData.enrollmentType,
          originalPrice: parseFloat(formData.originalPrice),
          discountApplied: parseFloat(formData.discountApplied),
          trialAttended: formData.trialAttended,
        }),
      })

      if (res.ok) {
        const result = await res.json()
        alert(`Successfully converted to student: ${result.student.studentId}`)
        router.push(`/dashboard/leads/${id}`)
      } else {
        const error = await res.json()
        alert(error.error || "Failed to convert lead")
      }
    } catch (error) {
      console.error("Error converting lead:", error)
      alert("Failed to convert lead")
    } finally {
      setConverting(false)
    }
  }

  const calculateEnrollmentPrice = (type: string, currency: "EUR" | "INR"): number => {
    const prices = {
      A1_ONLY: COURSE_PRICING.A1[currency],
      FOUNDATION_A1_A2: COURSE_PRICING.A1[currency] + COURSE_PRICING.A2[currency],
      CAREER_A1_A2_B1: COURSE_PRICING.A1[currency] + COURSE_PRICING.A2[currency] + COURSE_PRICING.B1[currency],
      COMPLETE_PATHWAY: COURSE_PRICING.A1[currency] + COURSE_PRICING.A2[currency] + COURSE_PRICING.B1[currency] + COURSE_PRICING.B2[currency],
    }
    return prices[type as keyof typeof prices] || 0
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === "checkbox"
      ? (e.target as HTMLInputElement).checked
      : e.target.value

    const updates: any = { [e.target.name]: value }

    // Auto-populate price when enrollment type or currency changes
    if (e.target.name === "enrollmentType" && value) {
      const price = calculateEnrollmentPrice(value as string, formData.currency)
      updates.originalPrice = price.toString()
    } else if (e.target.name === "currency" && formData.enrollmentType) {
      const price = calculateEnrollmentPrice(formData.enrollmentType, value as "EUR" | "INR")
      updates.originalPrice = price.toString()
    }

    setFormData({
      ...formData,
      ...updates,
    })
  }

  const calculateFinalPrice = () => {
    const original = parseFloat(formData.originalPrice) || 0
    const discount = parseFloat(formData.discountApplied) || 0
    return original - discount
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Lead not found</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Convert Lead to Student</h1>
        <p className="text-gray-500">Convert {lead.name} into a registered student</p>
      </div>

      {/* Lead Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Lead Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Name:</span> {lead.name}
          </div>
          <div>
            <span className="text-blue-700">WhatsApp:</span> {lead.whatsapp}
          </div>
          {lead.email && (
            <div>
              <span className="text-blue-700">Email:</span> {lead.email}
            </div>
          )}
          <div>
            <span className="text-blue-700">Source:</span> {lead.source.replace(/_/g, " ")}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Batch Selection */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Batch Assignment</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Batch <span className="text-red-500">*</span>
            </label>
            <select
              name="batchId"
              required
              value={formData.batchId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select a batch</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.batchCode} - {batch.level} ({batch.enrolledCount}/{batch.totalSeats} seats)
                </option>
              ))}
            </select>
            {lead.interestedBatch && (
              <p className="text-xs text-gray-500 mt-1">
                Lead was interested in: {lead.interestedBatch.batchCode}
              </p>
            )}
          </div>
        </div>

        {/* Enrollment Type */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Enrollment Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency <span className="text-red-500">*</span>
              </label>
              <select
                name="currency"
                required
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="EUR">EUR (€)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enrollment Type <span className="text-red-500">*</span>
              </label>
              <select
                name="enrollmentType"
                required
                value={formData.enrollmentType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select enrollment type</option>
                <option value="A1_ONLY">
                  A1 Only (€{COURSE_PRICING.A1.EUR} / ₹{COURSE_PRICING.A1.INR})
                </option>
                <option value="FOUNDATION_A1_A2">
                  Foundation - A1 + A2 (€{COURSE_PRICING.A1.EUR + COURSE_PRICING.A2.EUR} / ₹{COURSE_PRICING.A1.INR + COURSE_PRICING.A2.INR})
                </option>
                <option value="CAREER_A1_A2_B1">
                  Career - A1 + A2 + B1 (€{COURSE_PRICING.A1.EUR + COURSE_PRICING.A2.EUR + COURSE_PRICING.B1.EUR} / ₹{COURSE_PRICING.A1.INR + COURSE_PRICING.A2.INR + COURSE_PRICING.B1.INR})
                </option>
                <option value="COMPLETE_PATHWAY">
                  Complete Pathway (€{COURSE_PRICING.A1.EUR + COURSE_PRICING.A2.EUR + COURSE_PRICING.B1.EUR + COURSE_PRICING.B2.EUR} / ₹{COURSE_PRICING.A1.INR + COURSE_PRICING.A2.INR + COURSE_PRICING.B1.INR + COURSE_PRICING.B2.INR})
                </option>
              </select>
              {lead.interestedType && (
                <p className="text-xs text-gray-500 mt-1">
                  Lead was interested in: {lead.interestedType.replace(/_/g, " ")}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Original Price ({formData.currency === "EUR" ? "€" : "₹"}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="originalPrice"
                  required
                  min="0"
                  step="0.01"
                  value={formData.originalPrice}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={formData.currency === "EUR" ? "134.00" : "14000.00"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Applied ({formData.currency === "EUR" ? "€" : "₹"})
                </label>
                <input
                  type="number"
                  name="discountApplied"
                  min="0"
                  step="0.01"
                  value={formData.discountApplied}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Final Price:</span>
                <span className="text-xl font-bold text-primary">
                  {formData.currency === "EUR" ? "€" : "₹"}{calculateFinalPrice().toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Trial Attendance */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Trial Information</h2>
          <div className="flex items-center">
            <input
              type="checkbox"
              name="trialAttended"
              checked={formData.trialAttended}
              onChange={handleChange}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label className="ml-2 text-sm text-gray-700">
              Student attended trial class
            </label>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Converting this lead will create a new student record and mark
            the lead as converted. This action cannot be undone easily.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={converting}
            className="px-6 py-2 bg-success text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {converting ? "Converting..." : "Convert to Student"}
          </button>
        </div>
      </form>
    </div>
  )
}
