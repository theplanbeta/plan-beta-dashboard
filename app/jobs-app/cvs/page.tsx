"use client"

import { useEffect, useState } from "react"
import { FileText, Download, Trash2, Loader2 } from "lucide-react"
import { useJobsAuth } from "@/components/jobs-app/AuthProvider"
import Link from "next/link"

interface CVEntry {
  id: string
  fileUrl: string
  language: string
  keywordsUsed: string[]
  templateUsed: string
  createdAt: string
  job: {
    title: string
    company: string
    slug: string | null
  }
}

export default function CVHistoryPage() {
  const { seeker } = useJobsAuth()
  const [cvs, setCvs] = useState<CVEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!seeker) {
      setLoading(false)
      return
    }
    fetch("/api/jobs-app/cv", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : Promise.resolve({ cvs: [] })))
      .then((data) => setCvs(data.cvs || []))
      .catch(() => setCvs([]))
      .finally(() => setLoading(false))
  }, [seeker])

  async function handleDelete(id: string) {
    if (!confirm("Delete this CV?")) return
    try {
      const res = await fetch(`/api/jobs-app/cv/${id}`, { method: "DELETE", credentials: "include" })
      if (res.ok) {
        setCvs((prev) => prev.filter((cv) => cv.id !== id))
      }
    } catch {
      // Network error — CV stays in the list
    }
  }

  if (!seeker) {
    return (
      <div className="space-y-5">
        <header className="amtlich-enter">
          <span className="amtlich-label">
            <span className="amtlich-rivet" /> Document archive
          </span>
          <h1 className="display mt-3" style={{ fontSize: "1.95rem" }}>
            Your CVs
          </h1>
        </header>

        <div
          className="amtlich-card text-center amtlich-enter amtlich-enter-delay-1"
          style={{ padding: "36px 24px" }}
        >
          <FileText
            size={40}
            strokeWidth={1.4}
            className="mx-auto"
            style={{ color: "var(--brass-shadow)" }}
          />
          <p
            className="ink-soft mt-3"
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.92rem",
            }}
          >
            Sign up to generate and manage tailored CVs.
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

  return (
    <div className="space-y-5">
      {/* ── Masthead ────────────────────────────────────────── */}
      <header className="amtlich-enter">
        <span className="amtlich-label">
          <span className="amtlich-rivet" /> Document archive
        </span>
        <h1 className="display mt-3" style={{ fontSize: "1.95rem" }}>
          Your CVs
        </h1>
        <p
          className="ink-soft mt-1"
          style={{
            fontFamily: "var(--f-body)",
            fontSize: "0.92rem",
          }}
        >
          Every Lebenslauf you've generated, archived by date.
        </p>
        <hr className="amtlich-divider mt-3" />
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2
            className="h-7 w-7 animate-spin"
            style={{ color: "var(--brass)" }}
          />
        </div>
      ) : cvs.length === 0 ? (
        <div
          className="amtlich-card text-center amtlich-enter amtlich-enter-delay-1"
          style={{ padding: "36px 24px" }}
        >
          <FileText
            size={40}
            strokeWidth={1.4}
            className="mx-auto"
            style={{ color: "var(--brass-shadow)" }}
          />
          <h2 className="display ink mt-3" style={{ fontSize: "1.1rem" }}>
            Empty archive
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
            Generate your first tailored CV from any job listing.
          </p>
          <Link
            href="/jobs-app/jobs"
            className="amtlich-btn amtlich-btn--primary mt-5 inline-block no-underline"
          >
            Browse jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {cvs.map((cv, i) => (
            <article
              key={cv.id}
              className="amtlich-card amtlich-enter relative"
              style={{
                padding: "16px 18px",
                animationDelay: `${Math.min(i * 40, 200)}ms`,
              }}
            >
              {/* CV metadata header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="mono ink-faded" style={{ fontSize: "var(--fs-mono-xs)" }}>
                    {cv.job.company}
                  </span>
                  <h3
                    className="display ink mt-0.5"
                    style={{
                      fontSize: "1.05rem",
                      lineHeight: 1.22,
                      fontVariationSettings: '"opsz" 36, "SOFT" 25, "wght" 580',
                    }}
                  >
                    {cv.job.title}
                  </h3>
                </div>
                <span
                  className="amtlich-stamp amtlich-stamp--ink"
                  style={{
                    transform: "rotate(2deg)",
                    fontSize: "var(--fs-mono-xs)",
                    padding: "3px 9px",
                  }}
                >
                  {cv.language}
                </span>
              </div>

              <hr className="amtlich-divider" style={{ margin: "12px 0 10px" }} />

              {/* Date + keywords */}
              <div
                className="mono ink-faded mb-2"
                style={{ fontSize: "var(--fs-mono-xs)" }}
              >
                {new Date(cv.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}{" "}
                · {cv.keywordsUsed.length} keywords
              </div>

              {cv.keywordsUsed.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {cv.keywordsUsed.slice(0, 5).map((kw, j) => (
                    <span
                      key={j}
                      style={{
                        fontFamily: "var(--f-mono)",
                        fontSize: "0.62rem",
                        letterSpacing: "0.04em",
                        color: "var(--ink-soft)",
                        background: "rgba(255, 250, 220, 0.45)",
                        border: "1px dotted rgba(140, 102, 24, 0.4)",
                        borderRadius: "2px",
                        padding: "2px 6px",
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                  {cv.keywordsUsed.length > 5 && (
                    <span
                      className="ink-faded"
                      style={{
                        fontFamily: "var(--f-mono)",
                        fontSize: "0.62rem",
                        padding: "2px 4px",
                      }}
                    >
                      +{cv.keywordsUsed.length - 5}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <a
                  href={`/api/jobs-app/cv/${cv.id}/download`}
                  className="amtlich-btn flex-1 inline-flex items-center justify-center gap-1.5 no-underline"
                  style={{ padding: "9px 12px", fontSize: "var(--fs-mono-xs)" }}
                >
                  <Download size={12} strokeWidth={2.2} />
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(cv.id)}
                  className="amtlich-btn inline-flex items-center justify-center"
                  style={{ padding: "9px 14px", fontSize: "var(--fs-mono-xs)" }}
                  aria-label="Delete CV"
                >
                  <Trash2 size={12} strokeWidth={2} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
