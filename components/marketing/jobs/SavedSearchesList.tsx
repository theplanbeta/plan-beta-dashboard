"use client"

import { useEffect, useState } from "react"
import { usePortalAuth } from "./JobPortalAuthProvider"

interface SavedSearch {
  id: string
  name: string
  filters: Record<string, unknown>
  alertEnabled: boolean
  lastAlertSent: string | null
  createdAt: string
}

export function SavedSearchesList() {
  const { isPremium } = usePortalAuth()
  const [searches, setSearches] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isPremium) { setLoading(false); return }
    const token = localStorage.getItem("pb-jobs-token")
    if (!token) { setLoading(false); return }

    fetch("/api/jobs/searches", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setSearches(data.searches || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isPremium])

  const toggleAlert = async (id: string, enabled: boolean) => {
    const token = localStorage.getItem("pb-jobs-token")
    if (!token) return

    setSearches(searches.map((s) => s.id === id ? { ...s, alertEnabled: enabled } : s))

    await fetch(`/api/jobs/searches/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ alertEnabled: enabled }),
    }).catch(() => {})
  }

  const deleteSearch = async (id: string) => {
    const token = localStorage.getItem("pb-jobs-token")
    if (!token) return

    setSearches(searches.filter((s) => s.id !== id))

    await fetch(`/api/jobs/searches/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
  }

  if (!isPremium) return null
  if (loading) return <div className="h-16 bg-white/[0.05] rounded-xl animate-pulse" />
  if (searches.length === 0) return null

  return (
    <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-xl p-4 sm:p-6 mb-6">
      <h3 className="text-sm font-semibold text-white mb-3">Saved Searches</h3>
      <div className="space-y-2">
        {searches.map((search) => (
          <div key={search.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300 truncate">{search.name}</p>
              <p className="text-[10px] text-gray-600">
                {Object.entries(search.filters)
                  .filter(([, v]) => Array.isArray(v) ? v.length > 0 : Boolean(v))
                  .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={search.alertEnabled}
                  onChange={(e) => toggleAlert(search.id, e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-white/20 bg-transparent text-primary focus:ring-primary/30"
                />
                <span className="text-[10px] text-gray-500">Alerts</span>
              </label>
              <button
                onClick={() => deleteSearch(search.id)}
                className="p-1 text-gray-600 hover:text-red-400 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
