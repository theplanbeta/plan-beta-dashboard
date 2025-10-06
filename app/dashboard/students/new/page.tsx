"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { COURSE_PRICING, COURSE_LEVELS, type Currency, type CourseLevel, getCurrencySymbol, calculateFinalPrice, calculateBalance, getPrice } from "@/lib/pricing"


type Batch = {
  id: string
  batchCode: string
  level: string
  status: string
  totalSeats: number
  enrolledCount: number
}

type Lead = {
  id: string
  name: string
  whatsapp: string | null
  email: string | null
  phone: string | null
  status: string
  quality: string
  interestedLevel: string | null
}

function NewStudentForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const batchId = searchParams.get("batchId")
  const leadId = searchParams.get("leadId")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [batches, setBatches] = useState<Batch[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [showLeadConversion, setShowLeadConversion] = useState(!!leadId)
  const [selectedLeadId, setSelectedLeadId] = useState(leadId || "")

  const [formData, setFormData] = useState({
    name: "",
    whatsapp: "",
    email: "",
    enrollmentType: "A1_ONLY",
    currentLevel: "NEW",
    batchId: batchId || "",
    originalPrice: 0,
    discountApplied: 0,
    totalPaid: 0,
    paymentStatus: "PENDING",
    referralSource: "ORGANIC",
    trialAttended: false,
    notes: "",
    currency: "EUR" as Currency,
    leadId: leadId || "",
  })

  useEffect(() => {
    fetchBatches()
    fetchLeads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedLeadId && leads.length > 0) {
      const lead = leads.find(l => l.id === selectedLeadId)
      if (lead) {
        setFormData(prev => ({
          ...prev,
          name: lead.name || "",
          whatsapp: lead.whatsapp || lead.phone || "",
          email: lead.email || "",
          currentLevel: lead.interestedLevel || "NEW",
          leadId: lead.id,
        }))
      } else {
        // Try fetching from API if not in the leads list
        fetch(`/api/leads/${selectedLeadId}`)
          .then(res => res.json())
          .then(leadData => {
            if (leadData) {
              setFormData(prev => ({
                ...prev,
                name: leadData.name || "",
                whatsapp: leadData.whatsapp || leadData.phone || "",
                email: leadData.email || "",
                currentLevel: leadData.interestedLevel || "NEW",
                leadId: leadData.id,
              }))
            }
          })
          .catch(error => console.error("Error fetching lead:", error))
      }
    }
  }, [selectedLeadId, leads])

  const fetchBatches = async () => {
    try {
      const res = await fetch("/api/batches")
      const data = await res.json()
      // Filter to show only PLANNING and FILLING batches
      const availableBatches = data.filter((b: Batch) =>
        b.status === "PLANNING" || b.status === "FILLING" || b.status === "RUNNING"
      )
      setBatches(availableBatches)
    } catch (error) {
      console.error("Error fetching batches:", error)
    }
  }

  const fetchLeads = async () => {
    try {
      // Fetch all unconverted leads
      const res = await fetch("/api/leads?converted=false")
      if (!res.ok) {
        throw new Error("Failed to fetch leads")
      }
      const data = await res.json()
      // Filter to only show qualified leads (QUALIFIED, TRIAL_SCHEDULED, TRIAL_ATTENDED)
      const qualifiedLeads = Array.isArray(data)
        ? data.filter((lead: Lead) =>
            lead.status === "QUALIFIED" ||
            lead.status === "TRIAL_SCHEDULED" ||
            lead.status === "TRIAL_ATTENDED"
          )
        : []
      setLeads(qualifiedLeads)
    } catch (error) {
      console.error("Error fetching leads:", error)
      setLeads([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        throw new Error("Failed to create student")
      }

      router.push("/dashboard/students")
      router.refresh()
    } catch (err) {
      setError("Failed to create student. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Auto-calculate price based on batch and currency
  const updatePriceFromBatch = (batchId: string, currency: Currency) => {
    if (!batchId) return null

    const selectedBatch = batches.find(b => b.id === batchId)
    if (!selectedBatch) return null

    // Map batch level to course level (A1, A2, B1, B2)
    const level = selectedBatch.level as CourseLevel
    if (level && COURSE_PRICING[level]) {
      return getPrice(level, currency)
    }
    return null
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    const newValue = type === "number"
      ? parseFloat(value) || 0
      : type === "checkbox"
      ? (e.target as HTMLInputElement).checked
      : value

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: newValue,
      }

      // Auto-fill price when batch or currency changes
      if (name === "batchId" || name === "currency") {
        const batchId = name === "batchId" ? newValue as string : prev.batchId
        const currency = name === "currency" ? newValue as Currency : prev.currency
        const price = updatePriceFromBatch(batchId, currency)
        if (price !== null) {
          updated.originalPrice = price
        }
      }

      return updated
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Add New Student</h1>
          <p className="mt-2 text-gray-600">Enter student information to create enrollment</p>
        </div>
        <Link
          href="/dashboard/students"
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {error && (
          <div className="bg-error/10 border border-error text-error px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Convert from Lead */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Convert from Existing Lead</h3>
            <button
              type="button"
              onClick={() => setShowLeadConversion(!showLeadConversion)}
              className="text-sm text-primary hover:text-primary-dark"
            >
              {showLeadConversion ? "Hide" : "Show"}
            </button>
          </div>

          {showLeadConversion && (
            <div className="space-y-3">
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Select a lead to convert --</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name} ({lead.whatsapp || lead.phone || lead.email}) - {lead.quality} - {lead.status}
                  </option>
                ))}
              </select>
              {selectedLeadId && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                  ✓ Lead data has been auto-filled below. Review and complete the remaining fields.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Personal Information */}
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
                placeholder="+49 123 4567890"
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

        {/* Enrollment Details */}
        <div className="space-y-4 border-t pt-6">
          <h2 className="text-lg font-semibold text-foreground">Enrollment Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enrollment Plan <span className="text-error">*</span>
              </label>
              <select
                name="enrollmentType"
                value={formData.enrollmentType}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="A1_ONLY">Single Level (Current Batch Only)</option>
                <option value="FOUNDATION_A1_A2">Foundation Track (A1 → A2)</option>
                <option value="CAREER_A1_A2_B1">Career Track (A1 → A2 → B1)</option>
                <option value="COMPLETE_PATHWAY">Complete Pathway (A1 → B2)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Learning path they plan to complete (helps with retention tracking)
              </p>
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
                {batches.map((batch) => {
                  const available = batch.totalSeats - batch.enrolledCount
                  const statusBadge = batch.status === "PLANNING" ? "📝 Planning" :
                                     batch.status === "FILLING" ? "🎯 Filling" : "▶️ Running"
                  return (
                    <option key={batch.id} value={batch.id}>
                      {batch.batchCode} ({batch.level}) - {statusBadge} - {available} seats available
                    </option>
                  )
                })}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Showing only active batches (Planning, Filling, Running)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referral Source <span className="text-error">*</span>
              </label>
              <select
                name="referralSource"
                value={formData.referralSource}
                onChange={handleChange}
                required
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

        {/* Pricing */}
        <div className="space-y-4 border-t pt-6">
          <h2 className="text-lg font-semibold text-foreground">Pricing & Payment</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency <span className="text-error">*</span>
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="EUR">EUR (€)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Original Price ({getCurrencySymbol(formData.currency)}) <span className="text-error">*</span>
              </label>
              <input
                type="number"
                name="originalPrice"
                value={formData.originalPrice}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount ({getCurrencySymbol(formData.currency)})
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
                Initial Payment ({getCurrencySymbol(formData.currency)})
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
                {getCurrencySymbol(formData.currency)}{calculateFinalPrice(formData.originalPrice, formData.discountApplied).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-600">Balance Remaining:</span>
              <span className="font-semibold text-warning">
                {getCurrencySymbol(formData.currency)}{calculateBalance(calculateFinalPrice(formData.originalPrice, formData.discountApplied), formData.totalPaid).toFixed(2)}
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

        {/* Notes */}
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
            placeholder="Any additional information about the student..."
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4 border-t pt-6">
          <Link
            href="/dashboard/students"
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Student"}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NewStudentPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto p-6">Loading...</div>}>
      <NewStudentForm />
    </Suspense>
  )
}
