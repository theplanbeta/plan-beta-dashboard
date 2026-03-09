"use client"

import { useState, useEffect } from "react"

export default function RealtimeBadge() {
  const [activeUsers, setActiveUsers] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true
    const poll = async () => {
      try {
        const res = await fetch("/api/analytics/website/ga4-realtime")
        if (res.ok) {
          const data = await res.json()
          if (mounted && data.configured !== false) {
            setActiveUsers(data.activeUsers ?? null)
          }
        }
      } catch {
        // ignore
      }
    }

    poll()
    const interval = setInterval(poll, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  if (activeUsers === null) return null

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
      </span>
      <span className="text-sm font-medium text-green-700 dark:text-green-400">
        {activeUsers} active now
      </span>
    </div>
  )
}
