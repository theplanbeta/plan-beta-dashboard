"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"

const PROFESSION_OPTIONS = ["Nursing", "IT", "Engineering", "Healthcare", "Hospitality", "Teaching", "Student Jobs"]
const LEVEL_OPTIONS = ["A1", "A2", "B1", "B2", "C1"]
const LOCATION_OPTIONS = ["Berlin", "Munich", "Hamburg", "Frankfurt", "Stuttgart", "Cologne", "Düsseldorf"]

export default function JobAlertSubscription() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [professions, setProfessions] = useState<string[]>([])
  const [germanLevels, setGermanLevels] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (searchParams.get("subscribed") === "true") {
      setShowSuccess(true)
    }
  }, [searchParams])

  function toggleItem(list: string[], item: string, setter: (v: string[]) => void) {
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item])
  }

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, professions, germanLevels, locations }),
      })

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || "Failed to start checkout")
      }
    } catch {
      alert("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="py-20 bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {showSuccess && (
          <div className="mb-8 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
            <p className="text-green-400 font-semibold text-lg">Subscription activated!</p>
            <p className="text-green-400/80 text-sm mt-1">
              You&apos;ll receive daily job alerts matching your preferences.
            </p>
          </div>
        )}

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-4 py-2 bg-primary/20 rounded-full text-primary text-sm font-medium mb-4">
              Daily Job Alerts
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">
              Get Jobs Delivered to Your Inbox
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              We scrape 20+ German employer career pages daily. Subscribe for EUR 1/month
              and get matched jobs sent directly to your email.
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="alert-name" className="block text-sm font-medium text-gray-400 mb-1">
                  Name
                </label>
                <input
                  id="alert-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                />
              </div>
              <div>
                <label htmlFor="alert-email" className="block text-sm font-medium text-gray-400 mb-1">
                  Email <span className="text-primary">*</span>
                </label>
                <input
                  id="alert-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                />
              </div>
            </div>

            {/* Profession Preferences */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Professions of Interest
              </label>
              <div className="flex flex-wrap gap-2">
                {PROFESSION_OPTIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleItem(professions, p, setProfessions)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      professions.includes(p)
                        ? "bg-primary text-white"
                        : "bg-white/[0.06] text-gray-400 hover:bg-white/[0.1]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* German Level Preferences */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Your German Level
              </label>
              <div className="flex flex-wrap gap-2">
                {LEVEL_OPTIONS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => toggleItem(germanLevels, l, setGermanLevels)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      germanLevels.includes(l)
                        ? "bg-primary text-white"
                        : "bg-white/[0.06] text-gray-400 hover:bg-white/[0.1]"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Location Preferences */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Preferred Locations
              </label>
              <div className="flex flex-wrap gap-2">
                {LOCATION_OPTIONS.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => toggleItem(locations, loc, setLocations)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      locations.includes(loc)
                        ? "bg-primary text-white"
                        : "bg-white/[0.06] text-gray-400 hover:bg-white/[0.1]"
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full md:w-auto px-8 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Redirecting to checkout..." : "Subscribe for EUR 1/month"}
              </button>
              <p className="text-gray-500 text-xs mt-3">
                Cancel anytime. Powered by Stripe. No commitments.
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
