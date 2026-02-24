"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { getTrackingData, getVisitorId, trackConversion, trackEvent } from "@/lib/tracking"

export default function ReferralCodePage() {
  const params = useParams()
  const code = (params.code as string)?.toUpperCase() || ""

  const [referrerName, setReferrerName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    interestedLevel: "",
    notes: "",
  })

  // Validate referral code on mount
  useEffect(() => {
    if (!code) return
    fetch(`/api/referrals/public?validate=${code}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.referrerName) setReferrerName(data.referrerName)
      })
      .catch(() => {})
  }, [code])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const tracking = getTrackingData()
      const visitorId = getVisitorId()

      const response = await fetch("/api/referrals/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          whatsapp: formData.phone,
          referralCode: code,
          landingPage: `/site/refer/${code}`,
          visitorId,
          ...tracking,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to submit")
      }

      const result = await response.json()
      trackConversion("Lead", undefined, result.eventId)
      trackEvent("referral_signup", { code })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const shareUrl = typeof window !== "undefined" ? window.location.href : ""
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    `I'm learning German at Plan Beta and it's been amazing! Join using my referral link and we both benefit: ${shareUrl}`
  )}`

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You!</h1>
          <p className="text-gray-600 mb-8">
            We&apos;ve received your request{referrerName ? ` via ${referrerName}'s referral` : ""}. Our team will contact you within 24 hours.
          </p>
          <Link
            href="/site/courses"
            className="inline-flex items-center justify-center px-8 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-all"
          >
            Browse Courses
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-50 via-white to-red-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {referrerName ? (
              <>
                <p className="text-sm font-medium text-primary mb-3 uppercase tracking-wide">
                  Referred by {referrerName}
                </p>
                <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                  Your Friend <span className="text-primary">{referrerName}</span> Thinks You&apos;d Love Learning German!
                </h1>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-primary mb-3 uppercase tracking-wide">
                  Referral: {code}
                </p>
                <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                  Start Your <span className="text-primary">German Journey</span>
                </h1>
              </>
            )}
            <p className="text-xl text-gray-600">
              Join Plan Beta and learn German from the comfort of your home. Live online classes, experienced teachers, and an affordable path to fluency.
            </p>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-16">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Get Started</h2>
            <p className="text-gray-600 mb-6">
              Fill out the form below and we&apos;ll help you find the perfect course.
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interested Level
                </label>
                <select
                  name="interestedLevel"
                  value={formData.interestedLevel}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select level...</option>
                  <option value="A1">A1 - Beginner</option>
                  <option value="A2">A2 - Elementary</option>
                  <option value="B1">B1 - Intermediate</option>
                  <option value="B2">B2 - Upper Intermediate</option>
                </select>
              </div>

              {/* Hidden referral code */}
              <input type="hidden" name="referralCode" value={code} />

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-4 bg-primary text-white text-lg font-semibold rounded-lg hover:bg-primary-dark transition-all disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Send Enquiry"}
              </button>

              <p className="text-sm text-gray-500 text-center">
                Referral code: <strong>{code}</strong>
              </p>
            </form>
          </div>

          {/* Share button */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-3">Want to share this page?</p>
            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Share on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
