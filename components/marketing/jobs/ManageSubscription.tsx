"use client"

import { useState } from "react"
import { usePortalAuth } from "./JobPortalAuthProvider"

export function ManageSubscription() {
  const { isPremium, email, tier, logout } = usePortalAuth()
  const [loading, setLoading] = useState(false)

  if (!isPremium) return null

  const handleManage = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/subscriptions/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-white font-semibold text-sm">Premium Account</h3>
          <p className="text-gray-500 text-xs">{email}</p>
        </div>
        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">
          {tier === "legacy" ? "Legacy" : "PRO"}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleManage}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-white/5 border border-white/[0.1] text-gray-300 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50"
        >
          {loading ? "..." : "Manage Billing"}
        </button>
        <button
          onClick={logout}
          className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Log out
        </button>
      </div>
    </div>
  )
}
