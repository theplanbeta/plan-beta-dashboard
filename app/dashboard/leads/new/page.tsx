"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function NewLeadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [showSmartPaste, setShowSmartPaste] = useState(false)
  const [pastedText, setPastedText] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    whatsapp: "",
    email: "",
    phone: "",
    source: "INSTAGRAM",
    quality: "WARM",
    status: "NEW",
    interestedLevel: "",
    interestedMonth: "",
    interestedBatchTime: "",
    notes: "",
    followUpDate: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        router.push("/dashboard/leads")
      } else {
        const error = await res.json()
        alert(error.error || "Failed to create lead")
      }
    } catch (error) {
      console.error("Error creating lead:", error)
      alert("Failed to create lead")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSmartParse = async () => {
    if (!pastedText.trim()) {
      alert("Please paste some text to parse")
      return
    }

    setParsing(true)

    try {
      // Warmup call to reduce latency
      fetch("/api/warmup").catch(() => {})

      const res = await fetch("/api/leads/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pastedText }),
      })

      if (res.ok) {
        const result = await res.json()
        const parsed = result.data

        // Update form with parsed data
        setFormData({
          ...formData,
          name: parsed.name || formData.name,
          whatsapp: parsed.whatsapp || formData.whatsapp,
          email: parsed.email || formData.email,
          source: parsed.source || formData.source,
          interestedLevel: parsed.interestedLevel || formData.interestedLevel,
          notes: parsed.notes ?
            (formData.notes ? `${formData.notes}\n\n${parsed.notes}` : parsed.notes)
            : formData.notes,
        })

        // Close the smart paste panel
        setShowSmartPaste(false)
        setPastedText("")

        alert("✅ Lead data parsed successfully! Review and edit as needed before saving.")
      } else {
        const error = await res.json()
        alert(error.error || "Failed to parse lead data")
      }
    } catch (error) {
      console.error("Error parsing lead data:", error)
      alert("Failed to parse lead data. Please try again.")
    } finally {
      setParsing(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Add New Lead</h1>
        <p className="text-gray-500">Capture a new lead for conversion tracking</p>
      </div>

      {/* Smart Paste Feature */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-dashed border-blue-300 rounded-lg p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
              ✨ Smart Paste (AI-Powered)
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              Paste data from Instagram, WhatsApp, or any source - AI will auto-fill the form
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSmartPaste(!showSmartPaste)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            {showSmartPaste ? "Hide" : "Try Smart Paste"}
          </button>
        </div>

        {showSmartPaste && (
          <div className="mt-4 space-y-3">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste anything here... Examples:&#10;&#10;• Copy-paste from Instagram DM&#10;• WhatsApp message&#10;• Notes from phone call&#10;• Any unstructured text with lead info&#10;&#10;AI will extract: name, phone, email, source, interested level, and notes"
              rows={8}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSmartParse}
                disabled={parsing || !pastedText.trim()}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 font-medium"
              >
                {parsing ? "🤖 Parsing with AI..." : "🚀 Parse with AI"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPastedText("")
                  setShowSmartPaste(false)
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-blue-600">
              💡 Tip: The more info you paste, the better AI can extract. It&apos;s smart enough to handle messy data!
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Contact Information */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="whatsapp"
                required
                value={formData.whatsapp}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="+49 123 456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="+49 123 456789"
              />
            </div>
          </div>
        </div>

        {/* Lead Details */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Lead Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source <span className="text-red-500">*</span>
              </label>
              <select
                name="source"
                required
                value={formData.source}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Quality</label>
              <select
                name="quality"
                value={formData.quality}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="HOT">Hot</option>
                <option value="WARM">Warm</option>
                <option value="COLD">Cold</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="INTERESTED">Booked</option>
                <option value="TRIAL_SCHEDULED">Trial Scheduled</option>
                <option value="TRIAL_ATTENDED">Trial Attended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Interest Details */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Booking Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Booked Level
              </label>
              <select
                name="interestedLevel"
                value={formData.interestedLevel}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Not specified</option>
                <option value="A1">A1 - Beginner</option>
                <option value="A2">A2 - Elementary</option>
                <option value="B1">B1 - Intermediate</option>
                <option value="B2">B2 - Upper Intermediate</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Booked Month
              </label>
              <select
                name="interestedMonth"
                value={formData.interestedMonth}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select month</option>
                {MONTHS.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Time
              </label>
              <select
                name="interestedBatchTime"
                value={formData.interestedBatchTime}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select time</option>
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
              </select>
            </div>
          </div>
        </div>

        {/* Follow-up */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Follow-up</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Follow-up Date
              </label>
              <input
                type="date"
                name="followUpDate"
                value={formData.followUpDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Additional notes about this lead..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2 border-t border-gray-200 mt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-base shadow-sm"
          >
            {loading ? "Creating..." : "Create Lead"}
          </button>
        </div>
      </form>

      {/* Spacer for mobile */}
      <div className="h-20"></div>
    </div>
  )
}
