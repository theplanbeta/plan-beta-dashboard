"use client"

import { useState } from "react"
import { usePortalAuth } from "./JobPortalAuthProvider"

interface SubscriptionModalProps {
  onClose: () => void
  triggerFeature?: string
}

const FEATURES = [
  { icon: "⚡", text: "English OK filter & salary sort" },
  { icon: "🔔", text: "Instant email, WhatsApp & push alerts" },
  { icon: "💾", text: "Saved jobs synced across devices" },
  { icon: "📊", text: "Full salary insights dashboard" },
  { icon: "🕐", text: "New jobs 6 hours early" },
  { icon: "✨", text: "No upgrade prompts" },
]

export function SubscriptionModal({ onClose, triggerFeature }: SubscriptionModalProps) {
  const { login } = usePortalAuth()
  const [mode, setMode] = useState<"subscribe" | "restore">("subscribe")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleSubscribe = async () => {
    if (!email) return
    setLoading(true)
    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          whatsapp: whatsapp || undefined,
          whatsappAlerts: !!whatsapp,
          professions: ["Student Jobs", "Hospitality"],
          germanLevels: [],
          locations: [],
          jobTypes: [],
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setMessage(data.error || "Something went wrong")
      }
    } catch {
      setMessage("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async () => {
    if (!email) return
    setLoading(true)
    setMessage("")
    try {
      const res = await fetch("/api/subscriptions/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage("Check your email for a login link!")
      } else {
        setMessage(data.error || "Something went wrong")
      }
    } catch {
      setMessage("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] border border-white/[0.1] rounded-2xl p-6 sm:p-8 max-w-md w-full relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {mode === "subscribe" ? (
          <>
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Upgrade to Premium</h3>
              {triggerFeature && (
                <p className="text-sm text-gray-400">
                  Unlock <span className="text-primary font-medium">{triggerFeature}</span> and more
                </p>
              )}
            </div>

            {/* Features list */}
            <div className="space-y-3 mb-6">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="text-lg">{f.icon}</span>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>

            {/* Price */}
            <div className="text-center mb-6 p-4 bg-primary/5 border border-primary/10 rounded-xl">
              <p className="text-3xl font-bold text-white">
                EUR 4.99<span className="text-lg text-gray-400 font-normal">/month</span>
              </p>
              <p className="text-xs text-emerald-400 font-medium mt-1">5 days free trial</p>
              <p className="text-xs text-gray-500 mt-0.5">Cancel anytime. No commitment.</p>
            </div>

            {/* Form fields */}
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/[0.1] rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
              <div>
                <input
                  type="tel"
                  placeholder="WhatsApp number (optional, e.g. +49 175...)"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/[0.1] rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
                <p className="text-[10px] text-gray-600 mt-1 ml-1">Get job alerts directly on WhatsApp</p>
              </div>
              <button
                onClick={handleSubscribe}
                disabled={!email || loading}
                className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {loading ? "Loading..." : "Start free trial"}
              </button>
            </div>

            {message && <p className="text-sm text-center mt-3 text-red-400">{message}</p>}

            <button
              onClick={() => { setMode("restore"); setMessage("") }}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-300 mt-4 transition-colors"
            >
              Already subscribed? Restore access
            </button>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Restore Premium Access</h3>
              <p className="text-sm text-gray-400">Enter the email you subscribed with</p>
            </div>

            <div className="space-y-3">
              <input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/[0.1] rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
              <button
                onClick={handleRestore}
                disabled={!email || loading}
                className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-all disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send me a login link"}
              </button>
            </div>

            {message && <p className="text-sm text-center mt-3 text-emerald-400">{message}</p>}

            <button
              onClick={() => { setMode("subscribe"); setMessage("") }}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-300 mt-4 transition-colors"
            >
              New subscriber? Subscribe
            </button>
          </>
        )}
      </div>
    </div>
  )
}
