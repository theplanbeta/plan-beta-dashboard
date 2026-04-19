"use client"

import { toast } from "sonner"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Euro,
  Languages,
  ExternalLink,
  FileText,
  Loader2,
  Sparkles,
  BookmarkPlus,
} from "lucide-react"
import { ScoreBreakdown } from "@/components/jobs-app/ScoreBreakdown"
import { useJobsAuth } from "@/components/jobs-app/AuthProvider"
import ApplicationKitModal from "@/components/jobs-app/ApplicationKitModal"
import { ShareButton } from "@/components/jobs-app/ShareButton"
import { appendUtm } from "@/lib/share-links"
import type { MatchLabel } from "@/lib/heuristic-scorer"
import type { DeepScoreResult } from "@/lib/jobs-ai"

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  WORKING_STUDENT: "Werkstudent",
  INTERNSHIP: "Internship",
  CONTRACT: "Contract",
}

export interface JobDetail {
  id: string
  slug: string
  title: string
  company: string
  location: string | null
  description: string | null
  salaryMin: number | null
  salaryMax: number | null
  currency: string
  germanLevel: string | null
  profession: string | null
  jobType: string | null
  requirements: string[]
  applyUrl: string | null
  viewCount: number
  createdAt: string
}

function stampVariantForScore(score: number): string {
  if (score >= 75) return "amtlich-stamp--green"
  if (score >= 60) return "amtlich-stamp--teal"
  return ""
}

function wetVariantForScore(score: number): string {
  if (score >= 75) return "amtlich-stamp-wet--green"
  if (score >= 60) return "amtlich-stamp-wet--blue"
  return ""
}

interface JobDetailClientProps {
  initialJob: JobDetail
}

export default function JobDetailClient({ initialJob }: JobDetailClientProps) {
  const router = useRouter()
  const auth = useJobsAuth()
  const isPremium = auth.isPremium

  // Seed state from SSR so we skip the initial spinner and still allow
  // client-side updates (e.g. auth-gated deep score coming from the API).
  const [job, setJob] = useState<JobDetail>(initialJob)
  const [matchScore, setMatchScore] = useState<number | null>(null)
  const [matchLabel, setMatchLabel] = useState<MatchLabel | null>(null)
  const [deepScore, setDeepScore] = useState<DeepScoreResult | null>(null)
  const [generating, setGenerating] = useState(false)
  const [showKitModal, setShowKitModal] = useState(false)
  const [kitApplicationId, setKitApplicationId] = useState<string | null>(null)
  const [trackingKit, setTrackingKit] = useState(false)
  const [savingOnly, setSavingOnly] = useState(false)

  // Profile-empty check reads from AuthProvider context (no separate fetch).
  const { seeker, loading: authLoading } = auth
  const isProfileEmpty = seeker?.profile
    ? !Array.isArray(seeker.profile.workExperience) || seeker.profile.workExperience.length === 0
    : null

  useEffect(() => {
    // Anonymous visitors keep the SSR payload; only authed users refetch
    // for match scoring + deep score (which require identity).
    if (authLoading) return
    if (!seeker) return
    fetch(`/api/jobs-app/jobs/${initialJob.slug}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.job) setJob(data.job)
        if (data?.matchScore !== undefined) setMatchScore(data.matchScore)
        if (data?.matchLabel !== undefined) setMatchLabel(data.matchLabel)
        if (data?.deepScore !== undefined) setDeepScore(data.deepScore)
      })
      .catch(() => {
        // Non-fatal — we still have SSR data to render.
      })
  }, [initialJob.slug, authLoading, seeker])

  async function handleGenerateCV() {
    if (!job) return
    setGenerating(true)
    try {
      const res = await fetch("/api/jobs-app/cv/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ jobPostingId: job.id, language: "en" }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.cv?.fileUrl) {
        window.open(data.cv.fileUrl, "_blank")
      } else {
        toast.error(data.error || "CV generation failed")
      }
    } catch {
      toast.error("Network error. Check your connection.")
    } finally {
      setGenerating(false)
    }
  }

  async function createOrGetApplication(
    stage: "SAVED" | "APPLIED" = "SAVED"
  ): Promise<string | null> {
    if (!job) return null
    try {
      const res = await fetch("/api/jobs-app/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ jobPostingId: job.id, stage }),
      })
      const data = await res.json()
      if (res.ok && data.application?.id) return data.application.id
      if (res.status === 409 && data.application?.id) return data.application.id
      toast.error(data.error || "Failed to track application")
      return null
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to track application")
      return null
    }
  }

  async function handleTrackAndGenerateKit() {
    if (!job) return
    setTrackingKit(true)
    try {
      const id = await createOrGetApplication("SAVED")
      if (id) {
        setKitApplicationId(id)
        setShowKitModal(true)
      }
    } finally {
      setTrackingKit(false)
    }
  }

  async function handleSaveToTracker() {
    if (!job) return
    setSavingOnly(true)
    try {
      const id = await createOrGetApplication("SAVED")
      if (id) toast.error("Saved to your tracker")
    } finally {
      setSavingOnly(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Back nav ────────────────────────────────────────── */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 amtlich-enter"
        style={{
          fontFamily: "var(--f-mono)",
          fontSize: "var(--fs-mono-sm)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--ink-faded)",
          background: "transparent",
          border: "none",
          padding: 0,
        }}
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Back to index
      </button>

      {/* ── Job Header Card (paper) ─────────────────────────── */}
      <header className="amtlich-card amtlich-enter amtlich-enter-delay-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span className="mono ink-faded" style={{ fontSize: "var(--fs-mono-xs)" }}>
              {job.company}
            </span>
            <h1
              className="display ink mt-1"
              style={{
                fontSize: "1.5rem",
                lineHeight: 1.15,
                fontVariationSettings: '"opsz" 72, "SOFT" 20, "wght" 560',
              }}
            >
              {job.title}
            </h1>
          </div>
          {matchScore !== null && matchLabel && (
            <div className="shrink-0 pt-1">
              <span
                className={`amtlich-stamp amtlich-stamp-wet ${stampVariantForScore(
                  matchScore
                )} ${wetVariantForScore(matchScore)}`}
                style={{ transform: "rotate(2deg)" }}
              >
                {matchScore}/100
              </span>
            </div>
          )}
        </div>

        <hr className="amtlich-divider" style={{ margin: "14px 0 10px" }} />

        <dl
          className="flex flex-wrap items-center gap-x-4 gap-y-2"
          style={{ fontFamily: "var(--f-mono)", fontSize: "var(--fs-mono-xs)" }}
        >
          {job.location && (
            <div className="flex items-center gap-1.5 ink-soft">
              <MapPin size={12} strokeWidth={1.8} />
              <span>{job.location}</span>
            </div>
          )}
          {job.jobType && (
            <div className="flex items-center gap-1.5 ink-soft">
              <Briefcase size={12} strokeWidth={1.8} />
              <span>{JOB_TYPE_LABELS[job.jobType] || job.jobType}</span>
            </div>
          )}
          {(job.salaryMin || job.salaryMax) && (
            <div className="flex items-center gap-1.5 ink-soft">
              <Euro size={12} strokeWidth={1.8} />
              <span>
                {job.salaryMin && job.salaryMax
                  ? `${job.salaryMin.toLocaleString()} – ${job.salaryMax.toLocaleString()}`
                  : job.salaryMin
                  ? `from ${job.salaryMin.toLocaleString()}`
                  : `up to ${job.salaryMax?.toLocaleString()}`}
                <span className="ink-faded"> EUR</span>
              </span>
            </div>
          )}
          {job.germanLevel && (
            <div className="flex items-center gap-1.5 ink-soft">
              <Languages size={12} strokeWidth={1.8} />
              <span>DE {job.germanLevel}</span>
            </div>
          )}
        </dl>
      </header>

      {/* ── AI Score Breakdown (premium) ────────────────────── */}
      {deepScore && (
        <div className="amtlich-enter amtlich-enter-delay-2">
          <ScoreBreakdown deepScore={deepScore} />
        </div>
      )}

      {/* ── Primary action ──────────────────────────────────── */}
      <div className="space-y-3 amtlich-enter amtlich-enter-delay-3">
        {!seeker ? (
          <Link
            href={`/jobs-app/auth?mode=register&next=${encodeURIComponent(`/jobs-app/job/${job.slug}`)}`}
            className="amtlich-btn amtlich-btn--primary block w-full text-center no-underline"
            style={{ padding: "14px 22px" }}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <FileText size={14} strokeWidth={2.2} />
              Sign up free to generate CV
            </span>
          </Link>
        ) : isPremium ? (
          <button
            type="button"
            onClick={handleTrackAndGenerateKit}
            disabled={trackingKit}
            className="amtlich-btn amtlich-btn--primary w-full disabled:cursor-not-allowed disabled:opacity-60"
            style={{ padding: "14px 22px" }}
          >
            {trackingKit ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Preparing kit…
              </span>
            ) : (
              <span className="inline-flex items-center justify-center gap-2">
                <Sparkles size={14} strokeWidth={2.2} />
                Track &amp; Generate Kit
              </span>
            )}
          </button>
        ) : isProfileEmpty ? (
          <Link
            href="/jobs-app/profile"
            className="amtlich-btn amtlich-btn--primary block w-full text-center no-underline"
            style={{ padding: "14px 22px" }}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <FileText size={14} strokeWidth={2.2} />
              Complete your profile first →
            </span>
          </Link>
        ) : (
          <Link
            href="/jobs-app/settings"
            className="amtlich-btn amtlich-btn--primary block w-full text-center no-underline"
            style={{ padding: "14px 22px" }}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <FileText size={14} strokeWidth={2.2} />
              Upgrade to generate CV
            </span>
          </Link>
        )}

        {/* Secondary row */}
        <div className="flex gap-2">
          {isPremium && (
            <>
              <button
                type="button"
                onClick={handleSaveToTracker}
                disabled={savingOnly}
                className="amtlich-btn flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ padding: "10px 12px", fontSize: "var(--fs-mono-xs)" }}
              >
                {savingOnly ? (
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" />
                    Saving
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <BookmarkPlus size={12} strokeWidth={2.2} />
                    Save
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={handleGenerateCV}
                disabled={generating}
                className="amtlich-btn flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ padding: "10px 12px", fontSize: "var(--fs-mono-xs)" }}
              >
                {generating ? (
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" />
                    CV
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <FileText size={12} strokeWidth={2.2} />
                    CV only
                  </span>
                )}
              </button>
            </>
          )}
          {job.applyUrl && (
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="amtlich-btn flex items-center justify-center gap-1.5 flex-1 no-underline"
              style={{ padding: "10px 12px", fontSize: "var(--fs-mono-xs)" }}
            >
              <ExternalLink size={12} strokeWidth={2.2} />
              Portal
            </a>
          )}
          <ShareButton
            text={
              matchScore != null
                ? `I got a ${matchScore}/100 match for ${job.title} at ${job.company}. Day Zero found it for me.`
                : `${job.title} at ${job.company} — check this out on Day Zero.`
            }
            url={appendUtm(`https://dayzero.xyz/jobs-app/job/${job.slug}`, {
              source: "whatsapp",
              medium: "share",
              campaign: "job-detail",
              code: seeker?.referralCode ?? undefined,
            })}
            label="Share"
            className="amtlich-btn flex items-center justify-center gap-1.5 flex-1"
            iconSize={12}
          />
        </div>
      </div>

      {/* ── Application Kit Modal ───────────────────────────── */}
      {kitApplicationId && (
        <ApplicationKitModal
          isOpen={showKitModal}
          onClose={() => setShowKitModal(false)}
          applicationId={kitApplicationId}
        />
      )}

      {/* ── Description (document page style) ───────────────── */}
      {job.description && (
        <section
          className="amtlich-page amtlich-enter amtlich-enter-delay-4"
          style={{ padding: "22px 22px 40px" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="mono">Role description</span>
            <span className="amtlich-stamp amtlich-stamp--ink">Gelesen</span>
          </div>
          <div
            className="whitespace-pre-wrap ink-soft"
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.95rem",
              lineHeight: 1.58,
            }}
          >
            {job.description}
          </div>
        </section>
      )}

      {/* ── Requirements ──────────────────────────────────── */}
      {job.requirements.length > 0 && (
        <section className="amtlich-card amtlich-enter">
          <div className="mb-3 flex items-center justify-between">
            <span className="mono">Requirements</span>
            <span
              className="mono ink-faded"
              style={{ fontSize: "var(--fs-mono-xs)" }}
            >
              {job.requirements.length} items
            </span>
          </div>
          <ul
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.92rem",
              lineHeight: 1.55,
              color: "var(--ink-soft)",
              paddingLeft: 0,
              listStyle: "none",
            }}
          >
            {job.requirements.map((req, i) => (
              <li
                key={i}
                className="flex items-start gap-3"
                style={{ marginBottom: "6px" }}
              >
                <span
                  className="mono ink-faded"
                  style={{
                    fontSize: "var(--fs-mono-xs)",
                    minWidth: "22px",
                    paddingTop: "3px",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
