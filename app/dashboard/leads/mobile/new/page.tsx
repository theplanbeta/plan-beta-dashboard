"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function MobileNewLeadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    whatsapp: "",
    email: "",
    source: "INSTAGRAM",
    quality: "WARM",
    status: "NEW",
    interestedLevel: "",
    interestedType: "",
    interestedMonth: "",
    interestedBatchTime: "",
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          phone: formData.whatsapp, // Use WhatsApp as phone
        }),
      })

      if (res.ok) {
        // Show success and redirect
        alert("✅ Lead added successfully!")
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Fixed Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Add New Lead</h1>
            <Link
              href="/dashboard/leads"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-1">📱 Mobile-optimized form</p>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="px-4 py-6 space-y-6">
        {/* Contact Information Section */}
        <div className="bg-white rounded-lg shadow-sm p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Contact Info</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter full name"
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WhatsApp Number <span className="text-red-600">*</span>
            </label>
            <input
              type="tel"
              name="whatsapp"
              value={formData.whatsapp}
              onChange={handleChange}
              required
              placeholder="+919876543210"
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +91)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email (Optional)
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@example.com"
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Lead Classification */}
        <div className="bg-white rounded-lg shadow-sm p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Classification</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source <span className="text-red-600">*</span>
            </label>
            <select
              name="source"
              value={formData.source}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="INSTAGRAM">Instagram</option>
              <option value="META_ADS">Meta Ads</option>
              <option value="GOOGLE">Google</option>
              <option value="ORGANIC">Organic/Word of Mouth</option>
              <option value="REFERRAL">Referral</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quality
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, quality: "HOT" })}
                className={`py-3 px-4 rounded-lg font-medium text-sm border-2 transition-all ${
                  formData.quality === "HOT"
                    ? "bg-red-50 border-red-500 text-red-700"
                    : "bg-white border-gray-200 text-gray-600"
                }`}
              >
                🔥 Hot
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, quality: "WARM" })}
                className={`py-3 px-4 rounded-lg font-medium text-sm border-2 transition-all ${
                  formData.quality === "WARM"
                    ? "bg-orange-50 border-orange-500 text-orange-700"
                    : "bg-white border-gray-200 text-gray-600"
                }`}
              >
                ☀️ Warm
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, quality: "COLD" })}
                className={`py-3 px-4 rounded-lg font-medium text-sm border-2 transition-all ${
                  formData.quality === "COLD"
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "bg-white border-gray-200 text-gray-600"
                }`}
              >
                ❄️ Cold
              </button>
            </div>
          </div>
        </div>

        {/* Course Interest */}
        <div className="bg-white rounded-lg shadow-sm p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Booking Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Booked Level
            </label>
            <select
              name="interestedLevel"
              value={formData.interestedLevel}
              onChange={handleChange}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select level...</option>
              <option value="A1">A1 - Beginner</option>
              <option value="A2">A2 - Elementary</option>
              <option value="B1">B1 - Intermediate</option>
              <option value="B2">B2 - Upper Intermediate</option>
              <option value="SPOKEN_GERMAN">Spoken German</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course Package
            </label>
            <select
              name="interestedType"
              value={formData.interestedType}
              onChange={handleChange}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select package...</option>
              <optgroup label="Individual Courses">
                <option value="A1_ONLY">A1 Only (€134)</option>
                <option value="A1_HYBRID">A1 Hybrid (€100)</option>
                <option value="A2_ONLY">A2 Only (€156)</option>
                <option value="B1_ONLY">B1 Only (€172)</option>
                <option value="B2_ONLY">B2 Only (€220)</option>
                <option value="SPOKEN_GERMAN">Spoken German (€120)</option>
              </optgroup>
              <optgroup label="Package Deals">
                <option value="FOUNDATION_A1_A2">Foundation: A1 + A2 (€290)</option>
                <option value="CAREER_A1_A2_B1">Career: A1 + A2 + B1 (€462)</option>
                <option value="COMPLETE_PATHWAY">Complete: A1 to B2 (€682)</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Booked Month
            </label>
            <select
              name="interestedMonth"
              value={formData.interestedMonth}
              onChange={handleChange}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select month...</option>
              {MONTHS.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Time
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, interestedBatchTime: "Morning" })}
                className={`py-3 px-4 rounded-lg font-medium text-sm border-2 transition-all ${
                  formData.interestedBatchTime === "Morning"
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "bg-white border-gray-200 text-gray-600"
                }`}
              >
                🌅 Morning
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, interestedBatchTime: "Evening" })}
                className={`py-3 px-4 rounded-lg font-medium text-sm border-2 transition-all ${
                  formData.interestedBatchTime === "Evening"
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "bg-white border-gray-200 text-gray-600"
                }`}
              >
                🌆 Evening
              </button>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow-sm p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            placeholder="Any additional information..."
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </form>

      {/* Fixed Bottom Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
        >
          {loading ? "Adding Lead..." : "✅ Add Lead"}
        </button>
      </div>
    </div>
  )
}
