"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

const STORAGE_KEY = "pb-profile-banner-dismissed"

export function ProfileCompletionBanner({ profileCompleteness }: { profileCompleteness: number }) {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (profileCompleteness >= 50) return
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) setDismissed(false)
  }, [profileCompleteness])

  if (dismissed || profileCompleteness >= 50) return null

  return (
    <div className="border rounded p-3 mb-4 bg-amber-50 flex items-center justify-between">
      <div className="text-sm">
        Your matches are more accurate with a full profile.{" "}
        <Link href="/jobs-app/profile" className="underline font-semibold">
          Add details →
        </Link>
      </div>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, "1")
          setDismissed(true)
        }}
        aria-label="Dismiss"
        className="text-lg leading-none px-2"
      >
        ×
      </button>
    </div>
  )
}
