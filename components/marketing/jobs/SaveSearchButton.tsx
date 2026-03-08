"use client"

import { useState } from "react"
import { usePortalAuth } from "./JobPortalAuthProvider"

interface SaveSearchButtonProps {
  filters: {
    germanLevel?: string
    location?: string
    jobType?: string
    englishOk?: boolean
    sortBy?: string
  }
}

export function SaveSearchButton({ filters }: SaveSearchButtonProps) {
  const { isPremium } = usePortalAuth()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!isPremium) return null

  // Don't show if no filters are active
  const hasFilters = Object.values(filters).some((v) => Boolean(v))
  if (!hasFilters) return null

  const handleSave = async () => {
    setSaving(true)
    const token = localStorage.getItem("pb-jobs-token")
    if (!token) { setSaving(false); return }

    const name = [
      filters.germanLevel && `${filters.germanLevel}`,
      filters.location,
      filters.jobType,
      filters.englishOk && "English OK",
    ].filter(Boolean).join(", ") || "My search"

    try {
      const res = await fetch("/api/jobs/searches", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          filters: {
            germanLevels: filters.germanLevel ? [filters.germanLevel] : [],
            locations: filters.location ? [filters.location] : [],
            jobTypes: filters.jobType ? [filters.jobType] : [],
            englishOk: filters.englishOk || false,
            salaryMin: null,
            search: "",
          },
          alertEnabled: true,
        }),
      })
      if (res.ok) setSaved(true)
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <span className="px-3 py-2 text-xs text-emerald-400 font-medium">
        Search saved with alerts
      </span>
    )
  }

  return (
    <button
      onClick={handleSave}
      disabled={saving}
      className="px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary font-medium hover:bg-primary/20 transition-all disabled:opacity-50"
    >
      {saving ? "Saving..." : "Save this search"}
    </button>
  )
}
