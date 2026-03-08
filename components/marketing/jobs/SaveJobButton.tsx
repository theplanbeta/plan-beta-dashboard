"use client"

import { useState, useEffect, useCallback } from "react"

const SAVED_KEY = "pb-saved-jobs"

function getSavedJobs(): string[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]")
  } catch {
    return []
  }
}

function setSavedJobs(ids: string[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(ids))
}

export function SaveJobButton({ jobId, size = "md" }: { jobId: string; size?: "sm" | "md" }) {
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSaved(getSavedJobs().includes(jobId))
  }, [jobId])

  const toggle = useCallback(() => {
    const current = getSavedJobs()
    if (current.includes(jobId)) {
      setSavedJobs(current.filter((id) => id !== jobId))
      setSaved(false)
    } else {
      setSavedJobs([...current, jobId])
      setSaved(true)
    }
  }, [jobId])

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5"
  const btnSize = size === "sm" ? "p-1.5" : "p-2"

  return (
    <button
      onClick={toggle}
      title={saved ? "Unsave job" : "Save job"}
      className={`${btnSize} rounded-lg border border-white/[0.1] hover:border-white/[0.2] transition-all ${
        saved ? "text-red-400 bg-red-500/10" : "text-gray-500 hover:text-gray-300 bg-white/5"
      }`}
    >
      <svg className={iconSize} fill={saved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    </button>
  )
}
