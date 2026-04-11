"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronDown, Loader2, FolderOpen } from "lucide-react"
import { useJobsAuth } from "@/components/jobs-app/AuthProvider"
import ApplicationCard from "@/components/jobs-app/ApplicationCard"
import { STAGE_LABELS } from "@/components/jobs-app/StageSelector"

interface Application {
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

const ACTIVE_STAGES = [
  "SAVED",
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
] as const

const CLOSED_STAGES = ["ACCEPTED", "REJECTED", "WITHDRAWN"] as const

export default function ApplicationsPage() {
  const { seeker, loading: authLoading } = useJobsAuth()

  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeOpen, setActiveOpen] = useState(true)
  const [closedOpen, setClosedOpen] = useState(false)

  const fetchApplications = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch("/api/jobs-app/applications", {
        credentials: "include",
      })
      if (!res.ok) {
        if (res.status === 401) {
          setApplications([])
          return
        }
        throw new Error(`Failed to load applications (${res.status})`)
      }
      const data = await res.json()
      setApplications(data.applications ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load applications")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!seeker) {
      setLoading(false)
      return
    }
    fetchApplications()
  }, [authLoading, seeker, fetchApplications])

  const handleStageChange = useCallback(
    async (id: string, newStage: string) => {
      setApplications((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, stage: newStage, updatedAt: new Date().toISOString() }
            : a
        )
      )
      try {
        const res = await fetch(`/api/jobs-app/applications/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ stage: newStage }),
        })
        if (!res.ok) throw new Error("Failed to update stage")
        await fetchApplications()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update stage")
        await fetchApplications()
      }
    },
    [fetchApplications]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      const previous = applications
      setApplications((prev) => prev.filter((a) => a.id !== id))
      try {
        const res = await fetch(`/api/jobs-app/applications/${id}`, {
          method: "DELETE",
          credentials: "include",
        })
        if (!res.ok) throw new Error("Failed to delete")
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete")
        setApplications(previous)
      }
    },
    [applications]
  )

  const handleCardClick = useCallback((id: string) => {
    if (typeof window !== "undefined") console.debug("card click", id)
  }, [])

  const groupedByStage = useMemo(() => {
    const map = new Map<string, Application[]>()
    for (const a of applications) {
      const arr = map.get(a.stage) ?? []
      arr.push(a)
      map.set(a.stage, arr)
    }
    return map
  }, [applications])

  const stats = useMemo(() => {
    let saved = 0
    let applied = 0
    let interviewing = 0
    let offers = 0
    for (const a of applications) {
      if (a.stage === "SAVED") saved++
      else if (a.stage === "APPLIED") applied++
      else if (a.stage === "SCREENING" || a.stage === "INTERVIEW")
        interviewing++
      else if (a.stage === "OFFER") offers++
    }
    return { saved, applied, interviewing, offers }
  }, [applications])

  // ── Render states ─────────────────────────────────────────

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2
          className="h-7 w-7 animate-spin"
          style={{ color: "var(--brass)" }}
        />
      </div>
    )
  }

  if (!seeker) {
    return (
      <div className="space-y-5">
        <header className="amtlich-enter">
          <span className="amtlich-label">
            <span className="amtlich-rivet" /> Case tracker
          </span>
          <h1 className="display mt-3" style={{ fontSize: "1.95rem" }}>
            Application tracker
          </h1>
        </header>

        <div
          className="amtlich-card text-center amtlich-enter amtlich-enter-delay-1"
          style={{ padding: "32px 24px" }}
        >
          <FolderOpen
            size={40}
            strokeWidth={1.5}
            className="mx-auto"
            style={{ color: "var(--brass-shadow)" }}
          />
          <h2 className="display ink mt-3" style={{ fontSize: "1.15rem" }}>
            Track every application in one folder
          </h2>
          <p
            className="ink-soft mt-2"
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.9rem",
              maxWidth: "32ch",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Sign up to save jobs and keep tabs on every stage of your German
            job hunt.
          </p>
          <Link
            href="/jobs-app/onboarding"
            className="amtlich-btn amtlich-btn--primary mt-5 inline-block no-underline"
          >
            Sign up
          </Link>
        </div>
      </div>
    )
  }

  if (applications.length === 0) {
    return (
      <div className="space-y-5">
        <header className="amtlich-enter">
          <span className="amtlich-label">
            <span className="amtlich-rivet" /> Case tracker
          </span>
          <h1 className="display mt-3" style={{ fontSize: "1.95rem" }}>
            Application tracker
          </h1>
          <p
            className="ink-soft mt-1"
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.92rem",
            }}
          >
            Your personal folder for every role you pursue.
          </p>
          <hr className="amtlich-divider mt-3" />
        </header>

        <div
          className="amtlich-card text-center amtlich-enter amtlich-enter-delay-1"
          style={{ padding: "36px 24px" }}
        >
          <FolderOpen
            size={40}
            strokeWidth={1.4}
            className="mx-auto"
            style={{ color: "var(--brass-shadow)" }}
          />
          <h2 className="display ink mt-3" style={{ fontSize: "1.1rem" }}>
            No open files
          </h2>
          <p
            className="ink-soft mt-2"
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.88rem",
              maxWidth: "32ch",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Save jobs from the index to start building your application folder.
          </p>
          <Link
            href="/jobs-app/jobs"
            className="amtlich-btn amtlich-btn--primary mt-5 inline-block no-underline"
          >
            Browse jobs
          </Link>
        </div>
      </div>
    )
  }

  // ── Main view ─────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Masthead ────────────────────────────────────────── */}
      <header className="amtlich-enter">
        <span className="amtlich-label">
          <span className="amtlich-rivet" /> Case tracker
        </span>
        <h1 className="display mt-3" style={{ fontSize: "1.95rem" }}>
          Application tracker
        </h1>
        <p
          className="ink-soft mt-1"
          style={{
            fontFamily: "var(--f-body)",
            fontSize: "0.92rem",
          }}
        >
          Your personal folder for every role you pursue.
        </p>
        <hr className="amtlich-divider mt-3" />
      </header>

      {/* ── Stats — ledger style ────────────────────────────── */}
      <section className="amtlich-card amtlich-enter amtlich-enter-delay-1">
        <div className="flex items-center justify-between">
          <span className="mono">Case load</span>
          <span
            className="mono ink-faded"
            style={{ fontSize: "var(--fs-mono-xs)" }}
          >
            {applications.length} total
          </span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <LedgerStat label="Saved" value={stats.saved} tone="ink-faded" />
          <LedgerStat label="Sent" value={stats.applied} tone="ink" />
          <LedgerStat label="Interview" value={stats.interviewing} tone="ink-teal" />
          <LedgerStat label="Offers" value={stats.offers} tone="ink-green" />
        </div>
      </section>

      {error && (
        <div
          className="amtlich-card"
          style={{
            padding: "10px 14px",
            fontFamily: "var(--f-mono)",
            fontSize: "var(--fs-mono-xs)",
            color: "var(--stamp-red)",
          }}
        >
          {error}
        </div>
      )}

      {/* ── Active case files ───────────────────────────────── */}
      <FolderSection
        title="Active cases"
        count={ACTIVE_STAGES.reduce(
          (sum, s) => sum + (groupedByStage.get(s)?.length ?? 0),
          0
        )}
        open={activeOpen}
        onToggle={() => setActiveOpen((v) => !v)}
        className="amtlich-enter amtlich-enter-delay-2"
      >
        <div className="space-y-5">
          {ACTIVE_STAGES.map((stage) => (
            <StageGroup
              key={stage}
              stage={stage}
              apps={groupedByStage.get(stage) ?? []}
              onStageChange={handleStageChange}
              onDelete={handleDelete}
              onCardClick={handleCardClick}
            />
          ))}
        </div>
      </FolderSection>

      {/* ── Closed cases ────────────────────────────────────── */}
      <FolderSection
        title="Closed cases"
        count={CLOSED_STAGES.reduce(
          (sum, s) => sum + (groupedByStage.get(s)?.length ?? 0),
          0
        )}
        open={closedOpen}
        onToggle={() => setClosedOpen((v) => !v)}
        className="amtlich-enter amtlich-enter-delay-3"
      >
        <div className="space-y-5">
          {CLOSED_STAGES.map((stage) => (
            <StageGroup
              key={stage}
              stage={stage}
              apps={groupedByStage.get(stage) ?? []}
              onStageChange={handleStageChange}
              onDelete={handleDelete}
              onCardClick={handleCardClick}
            />
          ))}
        </div>
      </FolderSection>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LedgerStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: string
}) {
  return (
    <div className="text-center">
      <div
        className={`display ${tone}`}
        style={{
          fontSize: "1.85rem",
          fontVariationSettings: '"opsz" 144, "SOFT" 20, "wght" 500',
          lineHeight: 1,
        }}
      >
        {String(value).padStart(2, "0")}
      </div>
      <div
        className="mono mt-1.5"
        style={{ fontSize: "var(--fs-mono-xs)" }}
      >
        {label}
      </div>
    </div>
  )
}

function FolderSection({
  title,
  count,
  open,
  onToggle,
  className,
  children,
}: {
  title: string
  count: number
  open: boolean
  onToggle: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={`amtlich-card ${className ?? ""}`} style={{ padding: 0 }}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between"
        style={{
          padding: "14px 18px",
          background: "transparent",
          border: "none",
        }}
      >
        <div className="flex items-center gap-3">
          <span className="mono">{title}</span>
          <span
            className="inline-flex items-center justify-center"
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: "var(--fs-mono-xs)",
              fontWeight: 700,
              color: "var(--ink)",
              background: "rgba(140, 102, 24, 0.15)",
              border: "1px solid rgba(140, 102, 24, 0.25)",
              borderRadius: "2px",
              padding: "2px 8px",
              minWidth: "22px",
            }}
          >
            {count}
          </span>
        </div>
        <ChevronDown
          size={14}
          strokeWidth={2}
          style={{
            color: "var(--ink-faded)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 180ms ease-out",
          }}
        />
      </button>
      {open && (
        <div
          style={{
            borderTop: "1px dashed rgba(140, 102, 24, 0.35)",
            padding: "14px 16px 18px",
          }}
        >
          {children}
        </div>
      )}
    </section>
  )
}

function StageGroup({
  stage,
  apps,
  onStageChange,
  onDelete,
  onCardClick,
}: {
  stage: string
  apps: Application[]
  onStageChange: (id: string, newStage: string) => void
  onDelete: (id: string) => void
  onCardClick: (id: string) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3
          className="mono"
          style={{ fontSize: "var(--fs-mono-xs)" }}
        >
          {STAGE_LABELS[stage] ?? stage}
        </h3>
        <span
          className="mono ink-faded"
          style={{ fontSize: "var(--fs-mono-xs)" }}
        >
          {apps.length}
        </span>
      </div>
      {apps.length === 0 ? (
        <div
          style={{
            fontFamily: "var(--f-body)",
            fontStyle: "italic",
            fontSize: "0.78rem",
            color: "var(--ink-faded)",
            padding: "8px 12px",
            border: "1px dashed rgba(140, 102, 24, 0.3)",
            borderRadius: "3px",
            textAlign: "center",
          }}
        >
          empty
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onStageChange={onStageChange}
              onDelete={onDelete}
              onClick={onCardClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}
