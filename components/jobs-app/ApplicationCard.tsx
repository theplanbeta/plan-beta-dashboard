"use client"

import { MapPin, Calendar, X } from "lucide-react"
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
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  const diffWk = Math.floor(diffDay / 7)
  if (diffWk < 4) return `${diffWk}w ago`
  const diffMo = Math.floor(diffDay / 30)
  return `${diffMo}mo ago`
}

function formatInterviewDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
}

// ---------------------------------------------------------------------------
// Component — pinned index card with brass rivet
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
      className="amtlich-card group relative cursor-pointer focus:outline-none"
      style={{ padding: "16px 18px" }}
    >
      {/* Brass rivet (top-left) */}
      <span
        className="amtlich-rivet absolute"
        style={{ top: "10px", left: "10px" }}
        aria-hidden="true"
      />

      {/* Delete button (top-right) */}
      <button
        type="button"
        onClick={handleDelete}
        aria-label="Remove application"
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full"
        style={{
          background: "rgba(230, 210, 170, 0.35)",
          border: "1px solid rgba(140, 102, 24, 0.35)",
          color: "var(--ink-faded)",
        }}
      >
        <X size={12} strokeWidth={2.2} />
      </button>

      {/* Header row */}
      <div className="pl-6 pr-8">
        <span className="mono ink-faded" style={{ fontSize: "var(--fs-mono-xs)" }}>
          {jobCompany}
        </span>
        <h3
          className="display ink mt-0.5"
          style={{
            fontSize: "1.05rem",
            lineHeight: 1.22,
            fontVariationSettings: '"opsz" 36, "SOFT" 25, "wght" 580',
          }}
        >
          {jobTitle}
        </h3>
      </div>

      <hr className="amtlich-divider" style={{ margin: "10px 0 8px" }} />

      {/* Stage + interview row */}
      <div className="flex items-center justify-between gap-2">
        <div onClick={(e) => e.stopPropagation()}>
          <StageSelector
            currentStage={stage}
            onChange={(newStage) => onStageChange(id, newStage)}
          />
        </div>

        {interviewDate && (
          <div
            className="flex items-center gap-1"
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: "var(--fs-mono-xs)",
              color: "var(--stamp-blue)",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <Calendar size={12} strokeWidth={2} />
            {formatInterviewDate(interviewDate)}
          </div>
        )}
      </div>

      {/* Footer row */}
      <div
        className="mt-2 flex items-center justify-between"
        style={{ fontFamily: "var(--f-mono)", fontSize: "var(--fs-mono-xs)" }}
      >
        <div className="flex items-center gap-1 ink-faded">
          {jobLocation && (
            <>
              <MapPin size={11} strokeWidth={1.8} />
              <span className="truncate">{jobLocation}</span>
            </>
          )}
        </div>
        <span className="ink-faded">Updated {formatRelativeUpdated(updatedAt)}</span>
      </div>
    </div>
  )
}
