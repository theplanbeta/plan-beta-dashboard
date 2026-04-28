"use client"

import { toast } from "sonner"
import { useEffect, useState, Fragment } from "react"
import {
  Dialog,
  DialogPanel,
  DialogBackdrop,
  DialogTitle,
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from "@headlessui/react"
import {
  Download,
  Copy,
  Mail,
  FileText,
  CheckCircle,
  X,
  Loader2,
  Lightbulb,
  Check,
} from "lucide-react"

interface ApplicationKitModalProps {
  isOpen: boolean
  onClose: () => void
  applicationId: string
  onMarkedAsApplied?: () => void
}

interface CVData {
  id: string
  fileUrl: string
  language: string
  createdAt: string
}

interface AnschreibenData {
  id?: string
  // Authed proxy path (preferred). Falls back to direct fileUrl for
  // legacy responses that didn't include it.
  downloadUrl?: string
  fileUrl: string
  language: string
}

interface EmailDraft {
  subject: string
  body: string
  attachmentNames: string[]
}

interface Kit {
  cv: CVData | null
  anschreiben: AnschreibenData | null
  emailDraft: EmailDraft
  portalGuide: string
  jobGermanLevel: string | null
  suggestedLanguage: "de" | "en"
}

interface Application {
  id: string
  jobPostingId: string
  jobTitle: string
  jobCompany: string
}

export default function ApplicationKitModal({
  isOpen,
  onClose,
  applicationId,
  onMarkedAsApplied,
}: ApplicationKitModalProps) {
  const [kit, setKit] = useState<Kit | null>(null)
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [generatingCV, setGeneratingCV] = useState(false)
  const [generatingAnschreiben, setGeneratingAnschreiben] = useState(false)
  const [markingApplied, setMarkingApplied] = useState(false)
  // Output language for CV + Anschreiben generation. Defaults to the
  // server's suggestion (German for B2+ jobs, English otherwise) once
  // the kit loads. User can override via the toggle.
  const [language, setLanguage] = useState<"de" | "en">("en")
  const [languageManuallySet, setLanguageManuallySet] = useState(false)

  const [copiedField, setCopiedField] = useState<"subject" | "body" | null>(null)

  useEffect(() => {
    if (!isOpen || !applicationId) return

    let cancelled = false
    setLoading(true)
    setError(null)
    setKit(null)
    setApplication(null)
    setCopiedField(null)

    async function load() {
      try {
        const [kitRes, appRes] = await Promise.all([
          fetch(`/api/jobs-app/applications/${applicationId}/kit`, { credentials: "include" }),
          fetch(`/api/jobs-app/applications`, { credentials: "include" }),
        ])

        if (!kitRes.ok) {
          const data = await kitRes.json().catch(() => ({}))
          throw new Error(data.error || "Failed to load application kit")
        }

        const kitData = await kitRes.json()

        let appData: Application | null = null
        if (appRes.ok) {
          const list = await appRes.json()
          const found = (list.applications || []).find(
            (a: Application) => a.id === applicationId
          )
          if (found) appData = found
        }

        if (!cancelled) {
          setKit(kitData.kit)
          setApplication(appData)
          // Sync language from server suggestion only if the user hasn't
          // already overridden it manually in this modal session.
          if (!languageManuallySet && kitData.kit?.suggestedLanguage) {
            setLanguage(kitData.kit.suggestedLanguage)
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load kit")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [isOpen, applicationId])

  async function refetchKit() {
    try {
      const res = await fetch(`/api/jobs-app/applications/${applicationId}/kit`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setKit(data.kit)
      }
    } catch {
      /* ignore */
    }
  }

  async function handleGenerateCV() {
    if (!application) {
      toast.error("Job details not loaded yet")
      return
    }
    setGeneratingCV(true)
    try {
      const res = await fetch("/api/jobs-app/cv/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ jobPostingId: application.jobPostingId, language }),
      })
      const data = await res.json()
      if (!res.ok) {
        const detail = data.debugDetail ? ` — ${data.debugDetail}` : ""
        toast.error((data.error || "CV generation failed") + detail, {
          duration: 12_000,
        })
        return
      }
      await refetchKit()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "CV generation failed")
    } finally {
      setGeneratingCV(false)
    }
  }

  async function handleGenerateAnschreiben() {
    if (!application) {
      toast.error("Job details not loaded yet")
      return
    }
    setGeneratingAnschreiben(true)
    try {
      const res = await fetch("/api/jobs-app/anschreiben/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ jobPostingId: application.jobPostingId, language }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error((data.error || "Cover letter generation failed") + (data.debugDetail ? ` — ${data.debugDetail}` : ""), {
          duration: 12_000,
        })
        return
      }
      await refetchKit()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cover letter generation failed")
    } finally {
      setGeneratingAnschreiben(false)
    }
  }

  async function handleCopy(field: "subject" | "body", value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 1500)
    } catch {
      toast.error("Copy failed — please copy manually")
    }
  }

  function handleDownloadAll() {
    // Both CVs and Anschreibens live in the private blob store; direct
    // fileUrl 403s. Prefer the kit-supplied downloadUrl (authed proxy);
    // fall back to constructing it from id for older responses.
    if (kit?.cv?.id) {
      window.open(`/api/jobs-app/cv/${kit.cv.id}/download`, "_blank")
    }
    const anschreibenHref =
      kit?.anschreiben?.downloadUrl ??
      (kit?.anschreiben?.id
        ? `/api/jobs-app/cv/${kit.anschreiben.id}/download`
        : null)
    if (anschreibenHref) {
      setTimeout(() => {
        window.open(anschreibenHref, "_blank")
      }, 200)
    }
    if (!kit?.cv?.id && !kit?.anschreiben?.fileUrl) {
      toast.error("No documents to download yet. Generate them first.")
    }
  }

  async function handleMarkAsApplied() {
    setMarkingApplied(true)
    try {
      const res = await fetch(`/api/jobs-app/applications/${applicationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          stage: "APPLIED",
          appliedAt: new Date().toISOString(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Failed to mark as applied")
        return
      }
      onMarkedAsApplied?.()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to mark as applied")
    } finally {
      setMarkingApplied(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="amtlich relative z-50"
    >
      <DialogBackdrop
        className="fixed inset-0 backdrop-blur-sm"
        style={{ background: "rgba(20, 17, 9, 0.55)" }}
      />

      <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4">
        <DialogPanel
          className="amtlich amtlich-paper flex h-full w-full flex-col overflow-hidden sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-2xl"
          style={{
            borderRadius: "6px 6px 0 0",
            borderTop: "2px solid var(--kraft-dark)",
            borderLeft: "1px solid var(--manila-edge)",
            borderRight: "1px solid var(--manila-edge)",
          }}
        >
          {/* ── Header ─────────────────────────────────── */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{
              borderBottom: "1px dashed rgba(140, 102, 24, 0.4)",
            }}
          >
            <div>
              <span className="amtlich-label">
                <span className="amtlich-rivet" /> Application kit
              </span>
              <DialogTitle
                className="display ink mt-1"
                style={{
                  fontSize: "1.1rem",
                  fontVariationSettings: '"opsz" 36, "SOFT" 25, "wght" 580',
                }}
              >
                {application?.jobTitle ?? "Your tailored documents"}
              </DialogTitle>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{
                background: "rgba(230, 210, 170, 0.4)",
                border: "1px solid rgba(140, 102, 24, 0.35)",
                color: "var(--ink-soft)",
              }}
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* ── Content ───────────────────────────────── */}
          {loading ? (
            <div className="flex flex-1 items-center justify-center py-16">
              <Loader2
                size={28}
                className="animate-spin"
                style={{ color: "var(--brass)" }}
              />
            </div>
          ) : error ? (
            <div className="flex flex-1 items-center justify-center px-6 py-16 text-center">
              <div>
                <span className="amtlich-stamp amtlich-stamp--ink">
                  Error
                </span>
                <p
                  className="ink-soft mt-3"
                  style={{
                    fontFamily: "var(--f-body)",
                    fontSize: "0.9rem",
                  }}
                >
                  {error}
                </p>
              </div>
            </div>
          ) : kit ? (
            <TabGroup
              as="div"
              className="flex flex-1 flex-col overflow-hidden"
            >
              {/* ── Tab bar — file divider style ─────── */}
              <TabList
                className="flex px-4"
                style={{
                  borderBottom: "1px solid rgba(140, 102, 24, 0.35)",
                  background: "rgba(230, 210, 170, 0.35)",
                }}
              >
                {["Documents", "Email", "Portal tips"].map((name) => (
                  <Tab key={name} as={Fragment}>
                    {({ selected }) => (
                      <button
                        className="flex-1 px-2 py-3 outline-none transition-all"
                        style={{
                          fontFamily: "var(--f-mono)",
                          fontSize: "var(--fs-mono-xs)",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: selected ? "var(--ink)" : "var(--ink-faded)",
                          borderBottom: selected
                            ? "2px solid var(--stamp-red)"
                            : "2px solid transparent",
                          background: "transparent",
                        }}
                      >
                        {name}
                      </button>
                    )}
                  </Tab>
                ))}
              </TabList>

              <TabPanels className="flex-1 overflow-y-auto">
                {/* ── Tab 1: Documents ──────────────── */}
                <TabPanel className="space-y-4 px-5 py-5">
                  {/* Language toggle for newly-generated documents.
                      Defaults to the server's suggestion (German for B2+
                      jobs); user can override before clicking Generate. */}
                  <div
                    className="amtlich-card flex items-center justify-between"
                    style={{ padding: "10px 14px" }}
                  >
                    <span
                      className="mono ink-soft"
                      style={{ fontSize: "var(--fs-mono-xs)" }}
                    >
                      Output language
                      {kit.jobGermanLevel ? ` · job requires ${kit.jobGermanLevel}` : ""}
                    </span>
                    <div
                      role="radiogroup"
                      aria-label="CV and Anschreiben output language"
                      className="inline-flex"
                      style={{
                        border: "1px solid var(--manila-edge)",
                        borderRadius: "3px",
                        overflow: "hidden",
                      }}
                    >
                      {(["de", "en"] as const).map((opt) => {
                        const selected = language === opt
                        return (
                          <button
                            key={opt}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => {
                              setLanguage(opt)
                              setLanguageManuallySet(true)
                            }}
                            style={{
                              fontFamily: "var(--f-mono)",
                              fontSize: "var(--fs-mono-xs)",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              padding: "6px 12px",
                              background: selected
                                ? "linear-gradient(180deg, #E34A2E 0%, #D93A1F 100%)"
                                : "transparent",
                              color: selected ? "#FFF8E7" : "var(--ink)",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            {opt === "de" ? "Deutsch" : "English"}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* CV */}
                  <div className="amtlich-card" style={{ padding: "16px" }}>
                    <div className="flex items-center justify-between">
                      <span className="mono inline-flex items-center gap-1.5">
                        <FileText
                          size={12}
                          strokeWidth={2}
                          style={{ color: "var(--ink-soft)" }}
                        />
                        Lebenslauf
                      </span>
                      {kit.cv && (
                        <span
                          className="amtlich-stamp amtlich-stamp--ink"
                          style={{
                            transform: "rotate(2deg)",
                            fontSize: "var(--fs-mono-xs)",
                            padding: "3px 9px",
                          }}
                        >
                          {kit.cv.language}
                        </span>
                      )}
                    </div>
                    {kit.cv ? (
                      <>
                        <p
                          className="ink-faded mt-2"
                          style={{
                            fontFamily: "var(--f-mono)",
                            fontSize: "var(--fs-mono-xs)",
                          }}
                        >
                          Generated{" "}
                          {new Date(kit.cv.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        <a
                          href={`/api/jobs-app/cv/${kit.cv.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="amtlich-btn mt-3 inline-flex w-full items-center justify-center gap-1.5 no-underline"
                          style={{ padding: "10px 16px" }}
                        >
                          <Download size={12} strokeWidth={2.2} />
                          Download CV
                        </a>
                      </>
                    ) : (
                      <>
                        <p
                          className="ink-faded mt-2"
                          style={{
                            fontFamily: "var(--f-body)",
                            fontSize: "0.85rem",
                            fontStyle: "italic",
                          }}
                        >
                          No CV generated yet for this role.
                        </p>
                        <button
                          type="button"
                          onClick={handleGenerateCV}
                          disabled={generatingCV}
                          className="amtlich-btn amtlich-btn--primary mt-3 inline-flex w-full items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60"
                          style={{ padding: "12px 16px" }}
                        >
                          {generatingCV ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              Generating
                            </>
                          ) : (
                            <>
                              <FileText size={13} strokeWidth={2.2} />
                              Generate CV
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Anschreiben */}
                  <div className="amtlich-card" style={{ padding: "16px" }}>
                    <div className="flex items-center justify-between">
                      <span className="mono inline-flex items-center gap-1.5">
                        <Mail
                          size={12}
                          strokeWidth={2}
                          style={{ color: "var(--ink-soft)" }}
                        />
                        Anschreiben
                      </span>
                      {kit.anschreiben && (
                        <span
                          className="amtlich-stamp amtlich-stamp--ink"
                          style={{
                            transform: "rotate(-2deg)",
                            fontSize: "var(--fs-mono-xs)",
                            padding: "3px 9px",
                          }}
                        >
                          {kit.anschreiben.language}
                        </span>
                      )}
                    </div>
                    {kit.anschreiben ? (
                      <a
                        href={
                          kit.anschreiben.downloadUrl ??
                          (kit.anschreiben.id
                            ? `/api/jobs-app/cv/${kit.anschreiben.id}/download`
                            : kit.anschreiben.fileUrl)
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="amtlich-btn mt-3 inline-flex w-full items-center justify-center gap-1.5 no-underline"
                        style={{ padding: "10px 16px" }}
                      >
                        <Download size={12} strokeWidth={2.2} />
                        Download cover letter
                      </a>
                    ) : (
                      <>
                        <p
                          className="ink-faded mt-2"
                          style={{
                            fontFamily: "var(--f-body)",
                            fontSize: "0.85rem",
                            fontStyle: "italic",
                          }}
                        >
                          No cover letter yet.
                        </p>
                        <button
                          type="button"
                          onClick={handleGenerateAnschreiben}
                          disabled={generatingAnschreiben}
                          className="amtlich-btn amtlich-btn--primary mt-3 inline-flex w-full items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60"
                          style={{ padding: "12px 16px" }}
                        >
                          {generatingAnschreiben ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              Generating
                            </>
                          ) : (
                            <>
                              <Mail size={13} strokeWidth={2.2} />
                              Generate cover letter
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </TabPanel>

                {/* ── Tab 2: Email draft ────────────── */}
                <TabPanel className="space-y-4 px-5 py-5">
                  <div>
                    <span className="mono">Subject</span>
                    <div className="flex gap-2 mt-1.5">
                      <input
                        type="text"
                        readOnly
                        value={kit.emailDraft.subject}
                        style={{
                          flex: 1,
                          fontFamily: "var(--f-body)",
                          fontSize: "0.92rem",
                          color: "var(--ink)",
                          background: "rgba(255, 253, 240, 0.7)",
                          border: "1px solid var(--manila-edge)",
                          borderRadius: "3px",
                          padding: "10px 12px",
                          boxShadow:
                            "0 1px 2px rgba(60, 40, 20, 0.12) inset",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy("subject", kit.emailDraft.subject)
                        }
                        className="amtlich-btn inline-flex items-center gap-1.5"
                        style={{ padding: "10px 14px", fontSize: "var(--fs-mono-xs)" }}
                      >
                        {copiedField === "subject" ? (
                          <>
                            <Check
                              size={12}
                              strokeWidth={2.5}
                              style={{ color: "var(--stamp-green)" }}
                            />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={12} strokeWidth={2} />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="mono">Body</span>
                      <button
                        type="button"
                        onClick={() => handleCopy("body", kit.emailDraft.body)}
                        className="amtlich-btn inline-flex items-center gap-1.5"
                        style={{ padding: "6px 10px", fontSize: "var(--fs-mono-xs)" }}
                      >
                        {copiedField === "body" ? (
                          <>
                            <Check
                              size={11}
                              strokeWidth={2.5}
                              style={{ color: "var(--stamp-green)" }}
                            />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={11} strokeWidth={2} />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <textarea
                      readOnly
                      value={kit.emailDraft.body}
                      rows={9}
                      className="mt-1.5"
                      style={{
                        width: "100%",
                        resize: "none",
                        fontFamily: "var(--f-body)",
                        fontSize: "0.9rem",
                        lineHeight: 1.55,
                        color: "var(--ink)",
                        background: "rgba(255, 253, 240, 0.7)",
                        border: "1px solid var(--manila-edge)",
                        borderRadius: "3px",
                        padding: "12px 14px",
                        boxShadow: "0 1px 2px rgba(60, 40, 20, 0.12) inset",
                      }}
                    />
                  </div>

                  <div
                    className="amtlich-card"
                    style={{ padding: "12px 14px" }}
                  >
                    <span className="mono">Attach</span>
                    <p
                      className="ink mt-1"
                      style={{
                        fontFamily: "var(--f-mono)",
                        fontSize: "var(--fs-mono-sm)",
                      }}
                    >
                      {kit.emailDraft.attachmentNames.join(" · ")}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadAll}
                    className="amtlich-btn w-full inline-flex items-center justify-center gap-2"
                    style={{ padding: "12px 18px" }}
                  >
                    <Download size={13} strokeWidth={2.2} />
                    Download all attachments
                  </button>
                </TabPanel>

                {/* ── Tab 3: Portal tips ──────────────── */}
                <TabPanel className="px-5 py-5">
                  <div className="amtlich-page" style={{ padding: "22px 22px 40px" }}>
                    <div className="flex items-center gap-2">
                      <Lightbulb
                        size={14}
                        strokeWidth={2}
                        style={{ color: "var(--stamp-teal)" }}
                      />
                      <span className="mono">Filing notes</span>
                    </div>
                    <p
                      className="ink-soft mt-3"
                      style={{
                        fontFamily: "var(--f-body)",
                        fontSize: "0.95rem",
                        lineHeight: 1.58,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {kit.portalGuide}
                    </p>
                  </div>
                </TabPanel>
              </TabPanels>
            </TabGroup>
          ) : null}

          {/* ── Footer ─────────────────────────────────── */}
          <div
            className="px-5 py-4"
            style={{
              borderTop: "1px dashed rgba(140, 102, 24, 0.4)",
              background: "rgba(230, 210, 170, 0.25)",
            }}
          >
            <button
              type="button"
              onClick={handleMarkAsApplied}
              disabled={markingApplied || loading || !!error}
              className="amtlich-btn amtlich-btn--primary w-full inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ padding: "14px 22px" }}
            >
              {markingApplied ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Stamping as applied…
                </>
              ) : (
                <>
                  <CheckCircle size={14} strokeWidth={2.2} />
                  Mark as applied
                </>
              )}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
