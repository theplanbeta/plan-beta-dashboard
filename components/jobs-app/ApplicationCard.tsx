"use client"

import { MapPin, Calendar, Trash2 } from "lucide-react"
import StageSelector from "./StageSelector"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApplicationCardProps {
  application: {
    id: string
    jobTitle: string
    jobCompany: string
    jobLocation: string | null
    stage: string
    appliedAt: string | null
    interviewDate: string | null
    notes: string | null
    updatedAt: string
    generatedCV: { id: string; fileUrl: string; language: string } | null
  }
  onStageChange: (id: string, newStage: string) => void
  onDelete: (id: string) => void
  onClick: (id: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeUpdated(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const diffMs = Date.now() - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "Updated just now"
  if (diffMin < 60) return `Updated ${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `Updated ${diffHr} hr${diffHr === 1 ? "" : "s"} ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `Updated ${diffDay} day${diffDay === 1 ? "" : "s"} ago`
  const diffWk = Math.floor(diffDay / 7)
  if (diffWk < 4) return `Updated ${diffWk} wk${diffWk === 1 ? "" : "s"} ago`
  const diffMo = Math.floor(diffDay / 30)
  return `Updated ${diffMo} mo${diffMo === 1 ? "" : "s"} ago`
}

function formatInterviewDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ApplicationCard({
  application,
  onStageChange,
  onDelete,
  onClick,
}: ApplicationCardProps) {
  const {
    id,
    jobTitle,
    jobCompany,
    jobLocation,
    stage,
    interviewDate,
    updatedAt,
  } = application

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Remove "${jobTitle}" from your tracker?`)
    ) {
      return
    }
    onDelete(id)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick(id)
        }
      }}
      className="group relative flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-200"
    >
      {/* Header: title + stage selector */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 pr-2">
          <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-blue-600">
            {jobTitle}
          </h3>
          <p className="mt-0.5 truncate text-sm text-gray-500">{jobCompany}</p>
        </div>
        <div className="flex shrink-0 items-start gap-1">
          <StageSelector
            currentStage={stage}
            onChange={(newStage) => onStageChange(id, newStage)}
          />
          <button
            type="button"
            onClick={handleDelete}
            aria-label="Delete application"
            className="rounded-full p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Location */}
      {jobLocation ? (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{jobLocation}</span>
        </div>
      ) : null}

      {/* Interview date — prominent */}
      {interviewDate ? (
        <div className="mt-1 flex items-center gap-1.5 rounded-md bg-purple-50 px-2.5 py-1.5 text-xs font-medium text-purple-800 ring-1 ring-inset ring-purple-200">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          Interview: {formatInterviewDate(interviewDate)}
        </div>
      ) : null}

      {/* Updated timestamp */}
      <p className="mt-1 text-[11px] text-gray-400">
        {formatRelativeUpdated(updatedAt)}
      </p>
    </div>
  )
}
