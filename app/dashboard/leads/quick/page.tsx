"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const LEVELS = [
  { value: "A1", label: "A1 - Beginner" },
  { value: "A2", label: "A2 - Elementary" },
  { value: "B1", label: "B1 - Intermediate" },
  { value: "B2", label: "B2 - Upper Intermediate" },
  { value: "SPOKEN_GERMAN", label: "Spoken German" },
]

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const BATCH_TIMINGS = ["Morning", "Evening"]

export default function QuickLeadEntry() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [showSmartPaste, setShowSmartPaste] = useState(false)
  const [pastedText, setPastedText] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    whatsapp: "",
    interestedLevel: "A1",
    interestedMonth: new Date().toLocaleString('default', { month: 'long' }),
    interestedBatchTime: "Morning",
  })

  const handleSmartParse = async () => {
    if (!pastedText.trim()) {
      setError("Please paste some text to parse")
      return
    }

    setParsing(true)
    setError("")

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
          name: parsed.name || formData.name,
          whatsapp: parsed.whatsapp || formData.whatsapp,
          interestedLevel: parsed.interestedLevel || formData.interestedLevel,
          interestedMonth: formData.interestedMonth,
          interestedBatchTime: formData.interestedBatchTime,
        })

        // Close the smart paste panel
        setShowSmartPaste(false)
        setPastedText("")
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
      } else {
        const error = await res.json()
        setError(error.error || "Failed to parse lead data")
      }
    } catch (error) {
      console.error("Error parsing lead data:", error)
      setError("Failed to parse lead data. Please try again.")
    } finally {
      setParsing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/leads/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create lead")
      }

      // Success - reset form
      setSuccess(true)
      setFormData({
        name: "",
        whatsapp: "",
        interestedLevel: "A1",
        interestedMonth: new Date().toLocaleString('default', { month: 'long' }),
        interestedBatchTime: "Morning",
      })

      // Hide success message after 2 seconds
      setTimeout(() => {
        setSuccess(false)
      }, 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create lead")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/dashboard/leads"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quick Lead Entry</h1>
            <p className="text-sm text-gray-600">Rapid lead capture for marketing team</p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-800 font-medium">✅ Success!</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Smart Paste Feature */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-dashed border-purple-300 rounded-lg p-5 mb-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-purple-900 flex items-center gap-2">
              ✨ Smart Paste (AI)
            </h3>
            <p className="text-sm text-purple-700 mt-1">
              Paste contact info - AI auto-fills the form
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSmartPaste(!showSmartPaste)}
            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
          >
            {showSmartPaste ? "Hide" : "Try It"}
          </button>
        </div>

        {showSmartPaste && (
          <div className="mt-4 space-y-3">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste anything here...&#10;&#10;Example:&#10;Name: Rahul Sharma&#10;WhatsApp: 9876543210&#10;Interested in A2 level"
              rows={6}
              className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSmartParse}
                disabled={parsing || !pastedText.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 font-medium text-sm"
              >
                {parsing ? "🤖 Parsing..." : "🚀 Parse with AI"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPastedText("")
                  setShowSmartPaste(false)
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Entry Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base"
              placeholder="Student name"
              autoFocus
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WhatsApp Number *
            </label>
            <input
              type="text"
              required
              minLength={5}
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base"
              placeholder="Phone number (any format)"
            />
          </div>

          {/* Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interested Level *
            </label>
            <select
              required
              value={formData.interestedLevel}
              onChange={(e) => setFormData({ ...formData, interestedLevel: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base"
            >
              {LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interested Month *
            </label>
            <select
              required
              value={formData.interestedMonth}
              onChange={(e) => setFormData({ ...formData, interestedMonth: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base"
            >
              {MONTHS.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Timing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Batch Timing *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {BATCH_TIMINGS.map((timing) => (
                <button
                  key={timing}
                  type="button"
                  onClick={() => setFormData({ ...formData, interestedBatchTime: timing })}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    formData.interestedBatchTime === timing
                      ? "border-primary bg-primary text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  {timing}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed font-medium text-base"
            >
              {loading ? "Saving..." : "Save Lead"}
            </button>
            <Link
              href="/dashboard/leads"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-base text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      {/* Info Box */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Quick Entry:</strong> This form captures essential info only. Lead status will be set to "NEW" and source to "DIRECT".
          You can add more details later from the full lead page.
        </p>
      </div>
    </div>
  )
}
