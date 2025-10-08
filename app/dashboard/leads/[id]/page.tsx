"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { getCurrencySymbol, COURSE_PRICING } from "@/lib/pricing"
import { generateInvoicePDF, generateInvoiceJPG } from "@/lib/invoice-generator"

type Invoice = {
  id: string
  invoiceNumber: string
  date: string
  dueDate: string
  currency: string
  status: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  items: any[]
  sentToEmail: string | null
  emailSentAt: string | null
  createdAt: string
}

type Lead = {
  id: string
  name: string
  whatsapp: string
  email: string | null
  phone: string | null
  source: string
  status: string
  quality: string
  interestedLevel: string | null
  interestedType: string | null
  interestedMonth: string | null
  interestedBatchTime: string | null
  converted: boolean
  convertedDate: string | null
  interestedBatch: {
    id: string
    batchCode: string
    level: string
    enrolledCount: number
    totalSeats: number
  } | null
  assignedTo: {
    name: string
    email: string
  } | null
  convertedToStudent: {
    studentId: string
    name: string
    email: string | null
    whatsapp: string
  } | null
  firstContactDate: string
  lastContactDate: string | null
  followUpDate: string | null
  followUpNotes: string | null
  notes: string | null
  contactAttempts: number
  trialScheduledDate: string | null
  trialAttendedDate: string | null
  createdAt: string
  updatedAt: string
}

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)

  useEffect(() => {
    fetchLead()
    fetchInvoices()
  }, [id])

  const fetchLead = async () => {
    try {
      const res = await fetch(`/api/leads/${id}`)
      if (res.ok) {
        const data = await res.json()
        setLead(data)
      } else {
        router.push("/dashboard/leads")
      }
    } catch (error) {
      console.error("Error fetching lead:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`/api/leads/${id}/invoice`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setInvoices(data)
        }
      }
    } catch (error) {
      console.error("Error fetching invoices:", error)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this lead?")) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        router.push("/dashboard/leads")
      } else {
        const error = await res.json()
        alert(error.error || "Failed to delete lead")
      }
    } catch (error) {
      console.error("Error deleting lead:", error)
      alert("Failed to delete lead")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading lead...</div>
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

  const getStatusColor = (status: string) => {
    const colors = {
      NEW: "text-info",
      CONTACTED: "text-blue-600",
      INTERESTED: "text-purple-600",
      TRIAL_SCHEDULED: "text-yellow-600",
      TRIAL_ATTENDED: "text-green-600",
      CONVERTED: "text-success",
      LOST: "text-error",
    }
    return colors[status as keyof typeof colors] || "text-gray-600"
  }

  const getQualityColor = (quality: string) => {
    const colors = {
      HOT: "text-red-600",
      WARM: "text-orange-600",
      COLD: "text-blue-600",
    }
    return colors[quality as keyof typeof colors] || "text-gray-600"
  }

  const getInvoiceStatusColor = (status: string) => {
    const colors = {
      DRAFT: "bg-gray-100 text-gray-800",
      SENT: "bg-blue-100 text-blue-800",
      PAID: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const handlePayAndConvert = async (invoiceId: string) => {
    const paidAmount = prompt("Enter the amount paid:")
    if (!paidAmount || isNaN(Number(paidAmount))) {
      alert("Invalid amount")
      return
    }

    if (!confirm("This will mark the invoice as paid and convert the lead to a student. Continue?")) {
      return
    }

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pay-and-convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidAmount: Number(paidAmount),
          batchId: lead?.interestedBatch?.id,
          enrollmentType: lead?.interestedType,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        alert(`✅ Lead converted to student! Student ID: ${data.studentId}`)
        await fetchLead()
        await fetchInvoices()
      } else {
        const error = await res.json()
        alert(error.error || "Failed to convert lead")
      }
    } catch (error) {
      console.error("Error converting lead:", error)
      alert("Failed to convert lead")
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{lead.name}</h1>
            <p className="text-sm text-gray-500">Lead Details</p>
          </div>
        </div>

        {/* Desktop Actions */}
        {!lead.converted && (
          <div className="hidden md:flex gap-2 mt-4">
            <Link
              href={`/dashboard/leads/${id}/invoice`}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm"
            >
              📱 Generate Invoice
            </Link>
            <Link
              href={`/dashboard/leads/${id}/edit`}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
            >
              Edit
            </Link>
            <Link
              href={`/dashboard/leads/${id}/convert`}
              className="px-4 py-2 bg-success text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Convert to Student
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-error text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        )}

        {/* Mobile Actions - Compact Grid */}
        {!lead.converted && (
          <div className="md:hidden grid grid-cols-2 gap-2 mt-4">
            <Link
              href={`/dashboard/leads/${id}/invoice`}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-white rounded-lg text-sm font-medium"
            >
              <span className="text-base">📱</span>
              <span>Invoice</span>
            </Link>
            <Link
              href={`/dashboard/leads/${id}/edit`}
              className="flex items-center justify-center px-3 py-2.5 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium"
            >
              Edit
            </Link>
            <Link
              href={`/dashboard/leads/${id}/convert`}
              className="flex items-center justify-center px-3 py-2.5 bg-success text-white rounded-lg text-sm font-medium"
            >
              Convert
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-2.5 bg-error text-white rounded-lg disabled:opacity-50 text-sm font-medium"
            >
              {deleting ? "..." : "Delete"}
            </button>
          </div>
        )}
      </div>

      {/* Converted Banner */}
      {lead.converted && lead.convertedToStudent && (
        <div className="bg-success/10 border border-success rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-success font-semibold">✓ Converted to Student</div>
              <div className="text-sm text-gray-700 mt-1">
                {lead.convertedToStudent.name} ({lead.convertedToStudent.studentId})
              </div>
              {lead.convertedDate && (
                <div className="text-xs text-gray-600">
                  Converted on {formatDate(lead.convertedDate)}
                </div>
              )}
            </div>
            <Link
              href={`/dashboard/students/${lead.convertedToStudent.studentId}`}
              className="px-4 py-2 bg-success text-white rounded-lg hover:bg-green-700"
            >
              View Student
            </Link>
          </div>
        </div>
      )}

      {/* Invoices Section */}
      {!lead.converted && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-foreground">Invoices</h2>
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Generate Invoice
            </button>
          </div>

          {invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No invoices generated yet. Click &quot;Generate Invoice&quot; to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm font-semibold text-gray-900">
                          {invoice.invoiceNumber}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getInvoiceStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Date:</span>{" "}
                          <span className="text-gray-900">{formatDate(invoice.date)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Total:</span>{" "}
                          <span className="font-semibold text-gray-900">
                            {getCurrencySymbol(invoice.currency as any)}
                            {Number(invoice.totalAmount).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Paid:</span>{" "}
                          <span className="text-gray-900">
                            {getCurrencySymbol(invoice.currency as any)}
                            {Number(invoice.paidAmount).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Remaining:</span>{" "}
                          <span className="text-gray-900">
                            {getCurrencySymbol(invoice.currency as any)}
                            {Number(invoice.remainingAmount).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      {invoice.sentToEmail && (
                        <div className="text-xs text-gray-600 mt-2">
                          Sent to: {invoice.sentToEmail}
                          {invoice.emailSentAt && ` on ${formatDate(invoice.emailSentAt)}`}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      {(invoice.status === "DRAFT" || invoice.status === "SENT") && (
                        <button
                          onClick={() => handlePayAndConvert(invoice.id)}
                          className="px-4 py-2 bg-success text-white rounded-lg hover:bg-green-700 text-sm whitespace-nowrap"
                        >
                          Mark as Paid & Convert
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Contact Information</h2>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-500">WhatsApp</div>
              <div className="text-gray-900">{lead.whatsapp}</div>
            </div>
            {lead.email && (
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="text-gray-900">{lead.email}</div>
              </div>
            )}
            {lead.phone && (
              <div>
                <div className="text-sm text-gray-500">Phone</div>
                <div className="text-gray-900">{lead.phone}</div>
              </div>
            )}
          </div>
        </div>

        {/* Lead Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Lead Status</h2>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div className={`font-semibold ${getStatusColor(lead.status)}`}>
                {lead.status.replace(/_/g, " ")}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Quality</div>
              <div className={`font-semibold ${getQualityColor(lead.quality)}`}>
                {lead.quality}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Source</div>
              <div className="text-gray-900">{lead.source.replace(/_/g, " ")}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Contact Attempts</div>
              <div className="text-gray-900">{lead.contactAttempts}</div>
            </div>
          </div>
        </div>

        {/* Interest Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Booking Details</h2>
          <div className="space-y-3">
            {lead.interestedLevel && (
              <div>
                <div className="text-sm text-gray-500">Booked Level</div>
                <div className="text-gray-900">{lead.interestedLevel}</div>
              </div>
            )}
            {lead.interestedType && (
              <div>
                <div className="text-sm text-gray-500">Enrollment Type</div>
                <div className="text-gray-900">{lead.interestedType.replace(/_/g, " ")}</div>
              </div>
            )}
            {lead.interestedMonth && (
              <div>
                <div className="text-sm text-gray-500">Booked Month</div>
                <div className="text-gray-900">{lead.interestedMonth}</div>
              </div>
            )}
            {lead.interestedBatchTime && (
              <div>
                <div className="text-sm text-gray-500">Batch Time</div>
                <div className="text-gray-900">{lead.interestedBatchTime}</div>
              </div>
            )}
            {lead.interestedBatch && (
              <div>
                <div className="text-sm text-gray-500">Assigned Batch (Legacy)</div>
                <div className="text-gray-900">
                  {lead.interestedBatch.batchCode} ({lead.interestedBatch.level})
                </div>
                <div className="text-xs text-gray-600">
                  {lead.interestedBatch.enrolledCount}/{lead.interestedBatch.totalSeats} enrolled
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Timeline</h2>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-500">First Contact</div>
              <div className="text-gray-900">{formatDate(lead.firstContactDate)}</div>
            </div>
            {lead.lastContactDate && (
              <div>
                <div className="text-sm text-gray-500">Last Contact</div>
                <div className="text-gray-900">{formatDate(lead.lastContactDate)}</div>
              </div>
            )}
            {lead.followUpDate && (
              <div>
                <div className="text-sm text-gray-500">Follow-up Scheduled</div>
                <div className="text-gray-900">{formatDate(lead.followUpDate)}</div>
              </div>
            )}
            {lead.trialScheduledDate && (
              <div>
                <div className="text-sm text-gray-500">Trial Scheduled</div>
                <div className="text-gray-900">{formatDate(lead.trialScheduledDate)}</div>
              </div>
            )}
            {lead.trialAttendedDate && (
              <div>
                <div className="text-sm text-gray-500">Trial Attended</div>
                <div className="text-gray-900">{formatDate(lead.trialAttendedDate)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {(lead.notes || lead.followUpNotes) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Notes</h2>
          <div className="space-y-4">
            {lead.notes && (
              <div>
                <div className="text-sm text-gray-500 mb-1">General Notes</div>
                <div className="text-gray-900 whitespace-pre-wrap">{lead.notes}</div>
              </div>
            )}
            {lead.followUpNotes && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Follow-up Notes</div>
                <div className="text-gray-900 whitespace-pre-wrap">{lead.followUpNotes}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assigned To */}
      {lead.assignedTo && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Assigned To</h2>
          <div>
            <div className="text-gray-900">{lead.assignedTo.name}</div>
            <div className="text-sm text-gray-600">{lead.assignedTo.email}</div>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <div className="flex justify-between">
          <div>Created: {formatDate(lead.createdAt)}</div>
          <div>Last Updated: {formatDate(lead.updatedAt)}</div>
        </div>
      </div>

      {/* Generate Invoice Modal */}
      {showInvoiceModal && (
        <InvoiceGeneratorModal
          lead={lead}
          onClose={() => setShowInvoiceModal(false)}
          onSuccess={() => {
            setShowInvoiceModal(false)
            fetchInvoices()
          }}
        />
      )}
    </div>
  )
}

// Calculate enrollment price based on interestedType
const calculateEnrollmentPrice = (type: string | null, currency: "EUR" | "INR"): number => {
  if (!type) return 0

  const prices = {
    // Individual courses
    A1_ONLY: COURSE_PRICING.A1[currency],
    A1_HYBRID: COURSE_PRICING.A1_HYBRID[currency],
    A2_ONLY: COURSE_PRICING.A2[currency],
    B1_ONLY: COURSE_PRICING.B1[currency],
    B2_ONLY: COURSE_PRICING.B2[currency],
    SPOKEN_GERMAN: COURSE_PRICING.SPOKEN_GERMAN[currency],
    // Package courses
    FOUNDATION_A1_A2: COURSE_PRICING.A1[currency] + COURSE_PRICING.A2[currency],
    CAREER_A1_A2_B1: COURSE_PRICING.A1[currency] + COURSE_PRICING.A2[currency] + COURSE_PRICING.B1[currency],
    COMPLETE_PATHWAY: COURSE_PRICING.A1[currency] + COURSE_PRICING.A2[currency] + COURSE_PRICING.B1[currency] + COURSE_PRICING.B2[currency],
  }
  return prices[type as keyof typeof prices] || 0
}

// Invoice Generator Modal Component
function InvoiceGeneratorModal({
  lead,
  onClose,
  onSuccess,
}: {
  lead: Lead
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    currency: "EUR" as "EUR" | "INR",
    originalPrice: calculateEnrollmentPrice(lead.interestedType, "EUR"),
    discountApplied: 0,
    payableNow: 0,
  })
  const [generating, setGenerating] = useState(false)

  // Auto-update price when currency changes
  useEffect(() => {
    const newPrice = calculateEnrollmentPrice(lead.interestedType, formData.currency)
    setFormData(prev => ({ ...prev, originalPrice: newPrice }))
  }, [formData.currency, lead.interestedType])

  const finalPrice = formData.originalPrice - formData.discountApplied
  const remainingAmount = finalPrice - formData.payableNow

  const handleGeneratePDF = async () => {
    setGenerating(true)

    try {
      const res = await fetch(`/api/leads/${lead.id}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        const result = await res.json()
        const invoiceData = result.invoice

        // Generate PDF
        const pdf = await generateInvoicePDF(invoiceData)
        pdf.save(`Invoice-${invoiceData.invoiceNumber}.pdf`)

        alert("✅ PDF Invoice downloaded successfully!")
        onSuccess()
      } else {
        const error = await res.json()
        alert(error.error || "Failed to generate invoice")
      }
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF invoice")
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateImage = async () => {
    setGenerating(true)

    try {
      const res = await fetch(`/api/leads/${lead.id}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        const result = await res.json()
        const invoiceData = result.invoice

        // Generate JPG (function handles download automatically)
        await generateInvoiceJPG(invoiceData)

        alert("✅ JPG Invoice downloaded successfully!")
        onSuccess()
      } else {
        const error = await res.json()
        alert(error.error || "Failed to generate invoice")
      }
    } catch (error) {
      console.error("Error generating image:", error)
      alert("Failed to generate JPG invoice")
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Default to PDF generation
    await handleGeneratePDF()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-foreground">Generate Invoice</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Lead Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Lead Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>{" "}
                <span className="text-gray-900">{lead.name}</span>
              </div>
              <div>
                <span className="text-gray-500">WhatsApp:</span>{" "}
                <span className="text-gray-900">{lead.whatsapp}</span>
              </div>
              {lead.email && (
                <div>
                  <span className="text-gray-500">Email:</span>{" "}
                  <span className="text-gray-900">{lead.email}</span>
                </div>
              )}
              {lead.interestedLevel && (
                <div>
                  <span className="text-gray-500">Level:</span>{" "}
                  <span className="text-gray-900">{lead.interestedLevel}</span>
                </div>
              )}
              {lead.interestedType && (
                <div>
                  <span className="text-gray-500">Enrollment:</span>{" "}
                  <span className="text-gray-900">{lead.interestedType.replace(/_/g, ' ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency *
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value as "EUR" | "INR" })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="EUR">EUR (€)</option>
              <option value="INR">INR (₹)</option>
            </select>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Original Price * {getCurrencySymbol(formData.currency)}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.originalPrice || ""}
                onChange={(e) => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-blue-50"
                required
              />
              {lead.interestedType && (
                <p className="text-xs text-success mt-1">
                  ✓ Auto-populated based on {lead.interestedType.replace(/_/g, ' ')}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount {getCurrencySymbol(formData.currency)}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.discountApplied || ""}
                onChange={(e) => setFormData({ ...formData, discountApplied: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Payable Now */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payable Now {getCurrencySymbol(formData.currency)}
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.payableNow || ""}
              onChange={(e) => setFormData({ ...formData, payableNow: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Summary */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Original Price:</span>
              <span className="font-semibold text-gray-900">
                {getCurrencySymbol(formData.currency)}{formData.originalPrice.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Discount:</span>
              <span className="text-red-600">
                -{getCurrencySymbol(formData.currency)}{formData.discountApplied.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-blue-200">
              <span className="font-semibold text-gray-900">Final Price:</span>
              <span className="font-bold text-gray-900">
                {getCurrencySymbol(formData.currency)}{finalPrice.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Payable Now:</span>
              <span className="text-green-600">
                {getCurrencySymbol(formData.currency)}{formData.payableNow.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Remaining Amount:</span>
              <span className="font-semibold text-gray-900">
                {getCurrencySymbol(formData.currency)}{remainingAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGeneratePDF}
                disabled={generating}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                {generating ? "Generating..." : "📄 Download PDF"}
              </button>
              <button
                type="button"
                onClick={handleGenerateImage}
                disabled={generating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {generating ? "Generating..." : "🖼️ Download JPG"}
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Click PDF for formal invoice or JPG for WhatsApp sharing
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
