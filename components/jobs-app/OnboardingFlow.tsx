"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { CVUploadDropzone } from "@/components/jobs-app/CVUploadDropzone"
import { ProfileEditor, type ProfileEditorValue } from "@/components/jobs-app/ProfileEditor"
import { useCVUploadPolling } from "@/hooks/useCVUploadPolling"

type Step = "1" | "2" | "3"

export function OnboardingFlow() {
  const router = useRouter()
  const params = useSearchParams()
  const step = (params.get("step") as Step) ?? "1"
  const importId = params.get("importId")

  const [value, setValue] = useState<ProfileEditorValue | null>(null)
  const [germanLevel, setGermanLevel] = useState<string | null>(null)
  const [field, setField] = useState<string | null>(null)
  const [pendingImportId, setPendingImportId] = useState<string | null>(importId)
  const [saving, setSaving] = useState(false)

  const { state: importState } = useCVUploadPolling(pendingImportId)

  useEffect(() => {
    if (importState?.status === "READY" && importState.mode === "REVIEW") {
      setValue(importState.parsedData as ProfileEditorValue)
      goTo("2", importState.id)
    }
    if (importState?.status === "FAILED") {
      toast.error(`Parse failed: ${importState.error ?? "unknown"}. Continuing manually.`)
      goTo("3", null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importState])

  function goTo(next: Step, id: string | null) {
    const qs = new URLSearchParams()
    qs.set("step", next)
    if (id) qs.set("importId", id)
    router.push(`/jobs-app/onboarding?${qs.toString()}`)
  }

  async function saveAndContinue() {
    if (!value) return
    setSaving(true)
    try {
      const id = pendingImportId
      await fetch(`/api/jobs-app/profile${id ? `?importId=${id}` : ""}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      })
      goTo("3", null)
    } finally {
      setSaving(false)
    }
  }

  async function finalizeOnboarding() {
    if (!germanLevel || !field) return
    await fetch("/api/jobs-app/profile", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ germanLevel, profession: field }),
    })
    router.push("/jobs-app/jobs")
  }

  if (step === "1") {
    const isParsing = importState?.status === "QUEUED" || importState?.status === "PARSING"
    return (
      <main className="p-4 max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Step 1 of 3 — Get started</h1>
        <p className="opacity-70">Pick how you want to build your profile.</p>

        <div className="grid gap-3">
          <button
            type="button"
            className="border rounded p-4 text-left"
            onClick={() => document.getElementById("cv-drop")?.scrollIntoView({ behavior: "smooth" })}
          >
            <strong>I have a CV — upload it</strong>
            <p className="text-sm opacity-60">Fastest. Claude parses your CV and pre-fills your profile.</p>
          </button>
          <button
            type="button"
            className="border rounded p-4 text-left"
            onClick={() => {
              setValue({
                firstName: null, lastName: null, currentJobTitle: null, yearsOfExperience: null,
                workExperience: [], skills: { technical: [], languages: [], soft: [] },
                educationDetails: [], certifications: [],
              })
              goTo("2", null)
            }}
          >
            <strong>I&apos;ll fill it manually</strong>
            <p className="text-sm opacity-60">Enter work experience, skills, and education yourself.</p>
          </button>
          <button
            type="button"
            className="border rounded p-4 text-left"
            onClick={() => {
              setValue({
                firstName: null, lastName: null, currentJobTitle: null, yearsOfExperience: 0,
                workExperience: [], skills: { technical: [], languages: [], soft: [] },
                educationDetails: [], certifications: [],
              })
              goTo("3", null)
            }}
          >
            <strong>I&apos;m a fresh graduate</strong>
            <p className="text-sm opacity-60">Skip work history. You can add it later as you build experience.</p>
          </button>
        </div>

        <div id="cv-drop">
          <CVUploadDropzone onUploadStart={(id) => setPendingImportId(id)} onError={(m) => toast.error(m)} />
          {isParsing && (
            <p className="text-sm opacity-60 mt-2">
              {importState?.progress ?? "Parsing your CV…"} (15–30 seconds)
            </p>
          )}
        </div>
      </main>
    )
  }

  if (step === "2" && value) {
    const workCount = value.workExperience.length
    const skillsCount = value.skills.technical.length + value.skills.languages.length + value.skills.soft.length
    const eduCount = value.educationDetails.length
    const flatSkills = [...value.skills.technical, ...value.skills.languages]
    return (
      <main className="p-4 max-w-2xl mx-auto space-y-5">
        <h1 className="text-2xl font-semibold">Step 2 of 3 — Review your profile</h1>
        {importId && (
          <p className="opacity-70">
            We found {workCount} job{workCount === 1 ? "" : "s"}, {skillsCount} skill
            {skillsCount === 1 ? "" : "s"}, and {eduCount} education entr
            {eduCount === 1 ? "y" : "ies"}. Quick scan:
          </p>
        )}
        {importId && (
          <div className="amtlich-card space-y-3" style={{ padding: "14px 16px" }}>
            {workCount > 0 && (
              <div>
                <p className="mono text-xs opacity-60">Work experience</p>
                <ul className="text-sm space-y-0.5 mt-1">
                  {value.workExperience.slice(0, 5).map((w) => (
                    <li key={w.id}>
                      • {w.title || "—"} at {w.company || "—"}
                      {w.from ? ` (${w.from}${w.to ? `–${w.to}` : "–present"})` : ""}
                    </li>
                  ))}
                  {workCount > 5 && (
                    <li className="opacity-50">…and {workCount - 5} more</li>
                  )}
                </ul>
              </div>
            )}
            {flatSkills.length > 0 && (
              <div>
                <p className="mono text-xs opacity-60">Skills</p>
                <p className="text-sm mt-1 opacity-80">
                  {flatSkills.slice(0, 15).join(" · ")}
                  {flatSkills.length > 15 ? " · …" : ""}
                </p>
              </div>
            )}
            {eduCount > 0 && (
              <div>
                <p className="mono text-xs opacity-60">Education</p>
                <ul className="text-sm space-y-0.5 mt-1">
                  {value.educationDetails.slice(0, 3).map((e) => (
                    <li key={e.id}>
                      • {e.degree ?? "—"}
                      {e.field ? ` in ${e.field}` : ""} — {e.institution}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={saveAndContinue}
            disabled={saving}
            className="amtlich-btn amtlich-btn--primary"
            style={{ padding: "12px 22px" }}
          >
            {saving ? "Saving…" : "Looks good →"}
          </button>
        </div>
        <details>
          <summary className="cursor-pointer opacity-70 mono text-xs">Review each detail</summary>
          <div className="mt-2">
            <ProfileEditor value={value} onChange={setValue} onSave={saveAndContinue} saving={saving} saveLabel="Continue →" />
          </div>
        </details>
      </main>
    )
  }

  return (
    <main className="p-4 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Step 3 of 3 — Two quick details</h1>

      <div className="space-y-2">
        <div className="text-sm uppercase opacity-60">German level</div>
        <div className="flex gap-2">
          {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
            <button
              key={l}
              type="button"
              className={`border px-4 py-2 min-h-[44px] min-w-[44px] ${germanLevel === l ? "bg-black text-white" : ""}`}
              onClick={() => setGermanLevel(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm uppercase opacity-60">Your field</div>
        <div className="flex flex-wrap gap-2">
          {["Nursing", "Engineering", "IT", "Healthcare", "Hospitality", "Accounting", "Teaching", "Other"].map((f) => (
            <button
              key={f}
              type="button"
              className={`border px-4 py-2 min-h-[44px] ${field === f ? "bg-black text-white" : ""}`}
              onClick={() => setField(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <button type="button" disabled={!germanLevel || !field} onClick={finalizeOnboarding} className="bg-black text-white px-4 py-2 rounded disabled:opacity-50">
        See your matches →
      </button>
    </main>
  )
}
