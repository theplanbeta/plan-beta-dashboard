"use client"

import { useState } from "react"
import { usePortalAuth } from "./JobPortalAuthProvider"
import { SubscriptionModal } from "./SubscriptionModal"

export function PortalAccountBar() {
  const { isPremium, email, loading, logout } = usePortalAuth()
  const [showModal, setShowModal] = useState(false)
  const [showRestore, setShowRestore] = useState(false)
  const [restoreEmail, setRestoreEmail] = useState("")
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [restoreMessage, setRestoreMessage] = useState("")

  const handleRestore = async () => {
    if (!restoreEmail) return
    setRestoreLoading(true)
    setRestoreMessage("")
    try {
      const res = await fetch("/api/subscriptions/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: restoreEmail }),
      })
      const data = await res.json()
      if (data.success) {
        setRestoreMessage("Check your email for a login link!")
      } else {
        setRestoreMessage(data.error || "No subscription found for this email")
      }
    } catch {
      setRestoreMessage("Network error. Please try again.")
    } finally {
      setRestoreLoading(false)
    }
  }

  if (loading) return null

  const handleManage = async () => {
    if (!email) return
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
      // silently fail
    }
  }

  if (isPremium) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-primary/5 border border-primary/10 rounded-xl mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">PRO</span>
          <span className="text-sm text-gray-300 truncate">{email}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleManage}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Manage
          </button>
          <button
            onClick={logout}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[#111] border border-white/[0.06] rounded-xl mb-4">
        <p className="text-sm text-gray-400">
          <span className="text-primary font-medium">Premium:</span> alerts, filters & saved jobs — EUR 1.99/mo
        </p>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setShowRestore(!showRestore)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Sign in
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-all"
          >
            Try free
          </button>
        </div>
      </div>

      {showRestore && (
        <div className="px-4 py-3 bg-[#0a0a0a] border border-white/[0.06] rounded-xl mb-4 -mt-2">
          <p className="text-xs text-gray-400 mb-2">Enter the email you subscribed with:</p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="your@email.com"
              value={restoreEmail}
              onChange={(e) => setRestoreEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRestore()}
              className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-white/[0.1] rounded-lg text-sm text-white placeholder:text-gray-600 focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
            <button
              onClick={handleRestore}
              disabled={!restoreEmail || restoreLoading}
              className="px-4 py-2 bg-white text-black text-xs font-semibold rounded-lg hover:bg-gray-100 transition-all disabled:opacity-50"
            >
              {restoreLoading ? "..." : "Send link"}
            </button>
          </div>
          {restoreMessage && (
            <p className={`text-xs mt-2 ${restoreMessage.includes("Check your email") ? "text-emerald-400" : "text-red-400"}`}>
              {restoreMessage}
            </p>
          )}
        </div>
      )}

      {showModal && <SubscriptionModal onClose={() => setShowModal(false)} />}
    </>
  )
}
