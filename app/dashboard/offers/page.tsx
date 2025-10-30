"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { generateOfferLetterPDF, downloadOfferLetter, type OfferLetterData } from "@/lib/offer-letter-generator"

type BatchAssignment = {
  level: string
  rate: number
}

type OfferLetter = {
  id: string
  offerNumber: string
  teacherId: string
  teacher: {
    id: string
    name: string
    email: string
  }
  teacherAddress: string
  offerDate: string
  acceptanceDeadline: string
  positionType: string
  batchAssignments: BatchAssignment[]
  status: string
  sentAt: string | null
  viewedAt: string | null
  notes: string | null
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  GENERATED: "bg-blue-100 text-blue-800",
  SENT: "bg-yellow-100 text-yellow-800",
  VIEWED: "bg-purple-100 text-purple-800",
  ACCEPTED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  EXPIRED: "bg-gray-200 text-gray-600",
}

export default function OfferLettersPage() {
  const [offers, setOffers] = useState<OfferLetter[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null)
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  useEffect(() => {
    fetchOffers()
  }, [])

  const fetchOffers = async () => {
    try {
      const res = await fetch("/api/offers")
      if (!res.ok) throw new Error("Failed to fetch offers")

      const data = await res.json()
      setOffers(data)
    } catch (error) {
      console.error("Error fetching offers:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePDF = async (offer: OfferLetter) => {
    setGeneratingPDF(offer.id)
    try {
      // Prepare data for PDF
      const pdfData: OfferLetterData = {
        offerNumber: offer.offerNumber,
        offerDate: format(new Date(offer.offerDate), "dd MMM yyyy"),
        acceptanceDeadline: format(new Date(offer.acceptanceDeadline), "dd MMM yyyy"),
        teacherName: offer.teacher.name,
        teacherAddress: offer.teacherAddress,
        teacherEmail: offer.teacher.email,
        positionType: offer.positionType,
        batchAssignments: offer.batchAssignments,
      }

      // Generate and download PDF
      await downloadOfferLetter(pdfData, `${offer.offerNumber}-${offer.teacher.name}.pdf`)

      // Update status to GENERATED
      await fetch(`/api/offers/${offer.id}/generate`, {
        method: "POST",
      })

      // Refresh offers list
      await fetchOffers()
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF. Please try again.")
    } finally {
      setGeneratingPDF(null)
    }
  }

  const handleSendEmail = async (offer: OfferLetter) => {
    if (!confirm(`Send offer letter ${offer.offerNumber} to ${offer.teacher.name} (${offer.teacher.email})?`)) {
      return
    }

    setSendingEmail(offer.id)
    try {
      const res = await fetch(`/api/offers/${offer.id}/send-email`, {
        method: "POST",
      })

      if (res.ok) {
        const data = await res.json()
        alert(`✅ Offer letter sent successfully to ${offer.teacher.email}`)
        // Refresh offers list to show updated status
        await fetchOffers()
      } else {
        const error = await res.json()
        alert(`❌ Failed to send email: ${error.error || error.details}`)
      }
    } catch (error) {
      console.error("Error sending email:", error)
      alert("❌ Failed to send email. Please try again.")
    } finally {
      setSendingEmail(null)
    }
  }

  const handleDelete = async (offer: OfferLetter) => {
    if (!["DRAFT", "REJECTED"].includes(offer.status)) {
      alert(`Cannot delete offer letter with status ${offer.status}. Only DRAFT or REJECTED offers can be deleted.`)
      return
    }

    if (!confirm(`Are you sure you want to delete offer letter ${offer.offerNumber}?`)) {
      return
    }

    try {
      const res = await fetch(`/api/offers/${offer.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setOffers(offers.filter(o => o.id !== offer.id))
        alert("✅ Offer letter deleted successfully")
      } else {
        const error = await res.json()
        alert(`❌ Failed to delete: ${error.error}`)
      }
    } catch (error) {
      console.error("Error deleting offer:", error)
      alert("❌ Failed to delete offer letter")
    }
  }

  const filteredOffers = statusFilter === "ALL"
    ? offers
    : offers.filter(o => o.status === statusFilter)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading offer letters...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Offer Letters</h1>
          <p className="text-gray-500">Create and manage teacher offer letters</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="GENERATED">Generated</option>
            <option value="SENT">Sent</option>
            <option value="VIEWED">Viewed</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
          </select>
          <Link href="/dashboard/offers/new" className="btn-primary">
            + Create Offer Letter
          </Link>
        </div>
      </div>

      {/* Offers List */}
      {offers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="text-gray-500 mb-4">No offer letters created yet</div>
          <Link
            href="/dashboard/offers/new"
            className="btn-primary inline-block px-6 py-2"
          >
            Create Your First Offer Letter
          </Link>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="text-gray-500">No offer letters with status "{statusFilter}"</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredOffers.map((offer) => (
            <div
              key={offer.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md dark:hover:shadow-lg transition-shadow"
            >
              {/* Offer Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-semibold text-foreground">
                      {offer.offerNumber}
                    </h3>
                    <span className={`px-3 py-1 text-sm rounded-full ${STATUS_COLORS[offer.status]}`}>
                      {offer.status}
                    </span>
                  </div>

                  {/* Teacher Info */}
                  <div className="flex flex-wrap gap-4 text-sm mb-3">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">Teacher:</span>
                      <span className="font-medium text-foreground">{offer.teacher.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium text-foreground">{offer.teacher.email}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">Position:</span>
                      <span className="font-medium text-foreground">
                        {offer.positionType === "FULL_TIME" ? "Full-Time" : "Part-Time"}
                      </span>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">Offer Date:</span>
                      <span className="font-medium text-foreground">
                        {format(new Date(offer.offerDate), "dd MMM yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">Deadline:</span>
                      <span className="font-medium text-foreground">
                        {format(new Date(offer.acceptanceDeadline), "dd MMM yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium text-foreground">
                        {format(new Date(offer.createdAt), "dd MMM yyyy")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGeneratePDF(offer)}
                    disabled={generatingPDF === offer.id}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                  >
                    {generatingPDF === offer.id ? "Generating..." : "📄 Download PDF"}
                  </button>
                  <button
                    onClick={() => handleSendEmail(offer)}
                    disabled={sendingEmail === offer.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                  >
                    {sendingEmail === offer.id ? "Sending..." : "📧 Send Email"}
                  </button>
                  <Link
                    href={`/dashboard/offers/${offer.id}/edit`}
                    className="btn-outline text-sm"
                  >
                    Edit
                  </Link>
                  {["DRAFT", "REJECTED"].includes(offer.status) && (
                    <button
                      onClick={() => handleDelete(offer)}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Batch Assignments */}
              <div className="pt-4 border-t">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Batch Assignments ({offer.batchAssignments.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {offer.batchAssignments.map((batch, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded"
                    >
                      {batch.level}: ₹{batch.rate}/hr
                    </span>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {offer.notes && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm font-medium text-gray-700 mb-1">Notes</div>
                  <div className="text-sm text-gray-600">{offer.notes}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
