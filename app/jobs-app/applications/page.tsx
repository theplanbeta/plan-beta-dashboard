"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronDown, Loader2, Briefcase } from "lucide-react"
import { useJobsAuth } from "@/components/jobs-app/AuthProvider"
import ApplicationCard from "@/components/jobs-app/ApplicationCard"
import { STAGE_LABELS } from "@/components/jobs-app/StageSelector"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  const handleStageChange = useCallback(
    async (id: string, newStage: string) => {
      // Optimistic update
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
    // Placeholder — parent can later open a detail modal or expand view
    // For now, log the click (no navigation to avoid breaking UX)
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.debug("Application card clicked:", id)
    }
  }, [])

  // -------------------------------------------------------------------------
  // Grouping + stats
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Render states
  // -------------------------------------------------------------------------

  if (authLoading || loading) {
    return (
      <div className="max-w-lg mx-auto space-y-4 pt-2">
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      </div>
    )
  }

  if (!seeker) {
    return (
      <div className="max-w-lg mx-auto space-y-4 pt-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <Briefcase className="mx-auto h-10 w-10 text-blue-500" />
          <h1 className="mt-3 text-lg font-semibold text-gray-900">
            Track your applications
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Sign up to save jobs and keep tabs on every stage of your German
            job hunt.
          </p>
          <Link
            href="/jobs-app/onboarding"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Sign up to track applications
          </Link>
        </div>
      </div>
    )
  }

  if (applications.length === 0) {
    return (
      <div className="max-w-lg mx-auto space-y-4 pt-2">
        <header>
          <h1 className="text-xl font-bold text-gray-900">Applications</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Your personal German job hunt tracker
          </p>
        </header>
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <Briefcase className="mx-auto h-10 w-10 text-gray-400" />
          <h2 className="mt-3 text-base font-semibold text-gray-900">
            No applications yet
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Start tracking your applications — save jobs from the jobs feed.
          </p>
          <Link
            href="/jobs-app/jobs"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Browse jobs
          </Link>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Main view
  // -------------------------------------------------------------------------

  return (
    <div className="max-w-lg mx-auto space-y-4 pt-2">
      <header>
        <h1 className="text-xl font-bold text-gray-900">Applications</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Your personal German job hunt tracker
        </p>
      </header>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <StatPill label="Saved" value={stats.saved} />
        <StatPill label="Applied" value={stats.applied} />
        <StatPill label="Interviewing" value={stats.interviewing} />
        <StatPill label="Offers" value={stats.offers} />
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      {/* Active section */}
      <CollapsibleSection
        title="Active"
        count={ACTIVE_STAGES.reduce(
          (sum, s) => sum + (groupedByStage.get(s)?.length ?? 0),
          0
        )}
        open={activeOpen}
        onToggle={() => setActiveOpen((v) => !v)}
      >
        <div className="space-y-4">
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
      </CollapsibleSection>

      {/* Closed section */}
      <CollapsibleSection
        title="Closed"
        count={CLOSED_STAGES.reduce(
          (sum, s) => sum + (groupedByStage.get(s)?.length ?? 0),
          0
        )}
        open={closedOpen}
        onToggle={() => setClosedOpen((v) => !v)}
      >
        <div className="space-y-4">
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
      </CollapsibleSection>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <span className="text-lg font-bold text-gray-900 tabular-nums">
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </span>
    </div>
  )
}

function CollapsibleSection({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string
  count: number
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
            {count}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open ? <div className="border-t border-gray-100 p-3">{children}</div> : null}
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
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {STAGE_LABELS[stage] ?? stage}
        </h3>
        <span className="text-[11px] text-gray-400">{apps.length}</span>
      </div>
      {apps.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-[11px] text-gray-400">
          No applications in this stage
        </div>
      ) : (
        <div className="space-y-2">
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
