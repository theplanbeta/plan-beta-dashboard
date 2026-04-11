"use client"

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
}

interface Application {
  id: string
  jobPostingId: string
  jobTitle: string
  jobCompany: string
}

function classNames(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ")
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

  const [copiedField, setCopiedField] = useState<"subject" | "body" | null>(null)

  // Fetch kit + application details whenever the modal opens
  useEffect(() => {
    if (!isOpen || !applicationId) return

    let cancelled = false
    setLoading(true)
    setError(null)

    async function load() {
      try {
        const [kitRes, appRes] = await Promise.all([
          fetch(`/api/jobs-app/applications/${applicationId}/kit`),
          fetch(`/api/jobs-app/applications`),
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
      const res = await fetch(`/api/jobs-app/applications/${applicationId}/kit`)
      if (res.ok) {
        const data = await res.json()
        setKit(data.kit)
      }
    } catch {
      // ignore
    }
  }

  async function handleGenerateCV() {
    if (!application) {
      alert("Job details not loaded yet")
      return
    }
    setGeneratingCV(true)
    try {
      const res = await fetch("/api/jobs-app/cv/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobPostingId: application.jobPostingId }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || "CV generation failed")
        return
      }
      await refetchKit()
    } catch (e) {
      alert(e instanceof Error ? e.message : "CV generation failed")
    } finally {
      setGeneratingCV(false)
    }
  }

  async function handleGenerateAnschreiben() {
    if (!application) {
      alert("Job details not loaded yet")
      return
    }
    setGeneratingAnschreiben(true)
    try {
      const res = await fetch("/api/jobs-app/anschreiben/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobPostingId: application.jobPostingId }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || "Cover letter generation failed")
        return
      }
      await refetchKit()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Cover letter generation failed")
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
      alert("Copy failed — please copy manually")
    }
  }

  function handleDownloadAll() {
    if (kit?.cv?.fileUrl) {
      window.open(kit.cv.fileUrl, "_blank")
    }
    if (kit?.anschreiben?.fileUrl) {
      // slight delay so browsers don't block the second popup
      setTimeout(() => {
        window.open(kit.anschreiben!.fileUrl, "_blank")
      }, 200)
    }
    if (!kit?.cv?.fileUrl && !kit?.anschreiben?.fileUrl) {
      alert("No documents to download yet. Generate them first.")
    }
  }

  async function handleMarkAsApplied() {
    setMarkingApplied(true)
    try {
      const res = await fetch(`/api/jobs-app/applications/${applicationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "APPLIED",
          appliedAt: new Date().toISOString(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Failed to mark as applied")
        return
      }
      onMarkedAsApplied?.()
      onClose()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to mark as applied")
    } finally {
      setMarkingApplied(false)
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4">
        <DialogPanel className="flex h-full w-full flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-2xl sm:rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <DialogTitle className="text-base font-semibold text-gray-900">
              Application Kit
            </DialogTitle>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex flex-1 items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="flex flex-1 items-center justify-center px-6 py-16 text-center text-sm text-red-600">
              {error}
            </div>
          ) : kit ? (
            <TabGroup
              as="div"
              className="flex flex-1 flex-col overflow-hidden"
            >
              <TabList className="flex border-b border-gray-200 bg-gray-50 px-3">
                {["Documents", "Email Draft", "Portal Tips"].map((name) => (
                  <Tab key={name} as={Fragment}>
                    {({ selected }) => (
                      <button
                        className={classNames(
                          "flex-1 px-2 py-3 text-sm font-medium outline-none transition-colors",
                          selected
                            ? "border-b-2 border-blue-600 text-blue-600"
                            : "border-b-2 border-transparent text-gray-500 hover:text-gray-700"
                        )}
                      >
                        {name}
                      </button>
                    )}
                  </Tab>
                ))}
              </TabList>

              <TabPanels className="flex-1 overflow-y-auto">
                {/* --- Tab 1: Documents --- */}
                <TabPanel className="space-y-3 px-5 py-4">
                  {/* CV Card */}
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <h3 className="text-sm font-semibold text-gray-900">
                        CV / Lebenslauf
                      </h3>
                    </div>
                    {kit.cv ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-gray-700">
                              {kit.cv.fileUrl.split("/").pop() || "CV.pdf"}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                {kit.cv.language.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(kit.cv.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <a
                            href={kit.cv.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">
                          No CV generated yet for this job.
                        </p>
                        <button
                          onClick={handleGenerateCV}
                          disabled={generatingCV}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
                        >
                          {generatingCV ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <FileText className="h-4 w-4" />
                              Generate CV
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Anschreiben Card */}
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <h3 className="text-sm font-semibold text-gray-900">
                        Cover Letter / Anschreiben
                      </h3>
                    </div>
                    {kit.anschreiben ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-gray-700">
                            {kit.anschreiben.fileUrl.split("/").pop() ||
                              "CoverLetter.pdf"}
                          </p>
                          <span className="mt-1 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {kit.anschreiben.language.toUpperCase()}
                          </span>
                        </div>
                        <a
                          href={kit.anschreiben.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </a>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">
                          No cover letter generated yet.
                        </p>
                        <button
                          onClick={handleGenerateAnschreiben}
                          disabled={generatingAnschreiben}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
                        >
                          {generatingAnschreiben ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Mail className="h-4 w-4" />
                              Generate Cover Letter
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </TabPanel>

                {/* --- Tab 2: Email Draft --- */}
                <TabPanel className="space-y-4 px-5 py-4">
                  {/* Subject */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Subject
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={kit.emailDraft.subject}
                        className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none"
                      />
                      <button
                        onClick={() =>
                          handleCopy("subject", kit.emailDraft.subject)
                        }
                        className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {copiedField === "subject" ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-green-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Body
                      </label>
                      <button
                        onClick={() => handleCopy("body", kit.emailDraft.body)}
                        className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {copiedField === "body" ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-green-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <textarea
                      readOnly
                      value={kit.emailDraft.body}
                      rows={10}
                      className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none"
                    />
                  </div>

                  {/* Attachments */}
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
                      Attach:
                    </p>
                    <p className="mt-1 text-sm text-blue-900">
                      {kit.emailDraft.attachmentNames.join(", ")}
                    </p>
                  </div>

                  {/* Download All */}
                  <button
                    onClick={handleDownloadAll}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
                  >
                    <Download className="h-4 w-4" />
                    Download All Attachments
                  </button>
                </TabPanel>

                {/* --- Tab 3: Portal Tips --- */}
                <TabPanel className="px-5 py-4">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                        <Lightbulb className="h-4 w-4 text-amber-700" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-amber-900">
                          Portal Application Tips
                        </h3>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-amber-900">
                          {kit.portalGuide}
                        </p>
                      </div>
                    </div>
                  </div>
                </TabPanel>
              </TabPanels>
            </TabGroup>
          ) : null}

          {/* Footer */}
          <div className="border-t border-gray-200 bg-white px-5 py-3">
            <button
              onClick={handleMarkAsApplied}
              disabled={markingApplied || loading || !!error}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:bg-green-300"
            >
              {markingApplied ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Marking as Applied...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Mark as Applied
                </>
              )}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
