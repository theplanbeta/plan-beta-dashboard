"use client"

import { useState } from "react"

type PageVisit = {
  path: string
  duration: number | null
  scrollDepth: number | null
  timestamp: string
}

type LeadJourney = {
  leadId: string
  leadName: string
  leadSource: string
  convertedAt: string
  pages: PageVisit[]
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—"
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return "Just now"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return "1 day ago"
  return `${days} days ago`
}

export default function LeadJourneyViewer({ journeys }: { journeys: LeadJourney[] }) {
  const [selectedIdx, setSelectedIdx] = useState(0)

  if (journeys.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No lead journeys available yet.</p>
      </div>
    )
  }

  const journey = journeys[selectedIdx]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Lead Journey Viewer</h3>

      {/* Lead selector */}
      <select
        value={selectedIdx}
        onChange={(e) => setSelectedIdx(Number(e.target.value))}
        className="w-full mb-4 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
      >
        {journeys.map((j, i) => (
          <option key={j.leadId} value={i}>
            {j.leadName} — {j.leadSource} — {new Date(j.convertedAt).toLocaleDateString()}
          </option>
        ))}
      </select>

      {/* Timeline */}
      {journey.pages.length === 0 ? (
        <p className="text-sm text-gray-400">No pageview data for this lead.</p>
      ) : (
        <div className="relative ml-3">
          {journey.pages.map((page, i) => (
            <div key={`${page.path}-${page.timestamp}`} className="flex items-start mb-4 last:mb-0">
              {/* Timeline line + dot */}
              <div className="flex flex-col items-center mr-4">
                <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-gray-800 z-10" />
                {i < journey.pages.length - 1 && (
                  <div className="w-0.5 flex-1 bg-gray-300 dark:bg-gray-600 min-h-[24px]" />
                )}
              </div>
              {/* Content */}
              <div className="flex-1 -mt-0.5">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                  {page.path}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 space-x-3">
                  <span>{formatRelativeTime(page.timestamp)}</span>
                  {page.duration !== null && <span>{formatDuration(page.duration)}</span>}
                  {page.scrollDepth !== null && <span>{page.scrollDepth}% scrolled</span>}
                </div>
              </div>
            </div>
          ))}
          {/* Conversion marker */}
          <div className="flex items-start">
            <div className="flex flex-col items-center mr-4">
              <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-800 z-10" />
            </div>
            <div className="flex-1 -mt-0.5">
              <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                Converted to Lead
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {formatRelativeTime(journey.convertedAt)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
