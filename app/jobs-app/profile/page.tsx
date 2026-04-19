"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CVUploadDropzone } from "@/components/jobs-app/CVUploadDropzone"
import { ProfileEditor, type ProfileEditorValue } from "@/components/jobs-app/ProfileEditor"
import { MergeDiffModal, type MergeDiffData } from "@/components/jobs-app/MergeDiffModal"
import { useCVUploadPolling } from "@/hooks/useCVUploadPolling"
import { useJobsAuth } from "@/components/jobs-app/AuthProvider"

export default function ProfilePage() {
  const router = useRouter()
  const { seeker, refresh } = useJobsAuth()
  const [value, setValue] = useState<ProfileEditorValue | null>(null)
  const [pendingImportId, setPendingImportId] = useState<string | null>(null)
  const [mergeDiff, setMergeDiff] = useState<MergeDiffData | null>(null)
  const [saving, setSaving] = useState(false)

  const { state: importState } = useCVUploadPolling(pendingImportId)

  useEffect(() => {
    const p = seeker?.profile
    if (!p) {
      // Still loading auth, or not signed in. Initialize to empty to unblock render.
      if (seeker !== null) {
        setValue({
          firstName: null,
          lastName: null,
          currentJobTitle: null,
          yearsOfExperience: null,
          workExperience: [],
          skills: { technical: [], languages: [], soft: [] },
          educationDetails: [],
          certifications: [],
        })
      }
      return
    }
    setValue({
      firstName: p.firstName ?? null,
      lastName: p.lastName ?? null,
      currentJobTitle: p.currentJobTitle ?? null,
      yearsOfExperience: p.yearsOfExperience ?? null,
      workExperience: (p.workExperience as ProfileEditorValue["workExperience"]) ?? [],
      skills: p.skills ?? { technical: [], languages: [], soft: [] },
      educationDetails: (p.educationDetails as ProfileEditorValue["educationDetails"]) ?? [],
      certifications: (p.certifications as ProfileEditorValue["certifications"]) ?? [],
    })
  }, [seeker])

  useEffect(() => {
    if (!importState) return
    if (importState.status === "READY") {
      if (importState.mode === "REVIEW") {
        const parsed = importState.parsedData as ProfileEditorValue
        setValue(parsed)
        setPendingImportId(null)
      } else if (importState.mode === "MERGED") {
        setMergeDiff(importState.mergeDiff as MergeDiffData)
      }
    }
    if (importState.status === "FAILED") {
      alert(`Parse failed: ${importState.error ?? "unknown"}`)
      setPendingImportId(null)
    }
  }, [importState])

  async function save() {
    if (!value) return
    setSaving(true)
    try {
      const importId = pendingImportId
      const res = await fetch(`/api/jobs-app/profile${importId ? `?importId=${importId}` : ""}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }))
        alert(err.error ?? "Save failed")
        return
      }
      setPendingImportId(null)
      setMergeDiff(null)
      await refresh() // pull the updated profile through AuthProvider so other pages see it
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function applyMerge() {
    await save()
  }

  async function cancelMerge() {
    if (!pendingImportId) return
    await fetch(`/api/jobs-app/profile/imports/${pendingImportId}`, {
      method: "DELETE",
      credentials: "include",
    })
    setPendingImportId(null)
    setMergeDiff(null)
  }

  if (!value) return <main className="p-4">Loading profile…</main>

  const isParsing = importState?.status === "QUEUED" || importState?.status === "PARSING"

  return (
    <main className="p-4 max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Your profile</h1>
        <p className="opacity-60 text-sm">Upload a CV or edit details directly. Your data stays private and is used only to score jobs and generate tailored CVs.</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm uppercase opacity-60">Refresh from a CV</h2>
        <CVUploadDropzone onUploadStart={(id) => setPendingImportId(id)} onError={(m) => alert(m)} compact />
        {isParsing && (
          <p className="text-sm opacity-60">
            {importState?.progress ?? "Parsing your CV…"} (this usually takes 15–30 seconds)
          </p>
        )}
      </section>

      <ProfileEditor value={value} onChange={setValue} onSave={save} saving={saving} saveLabel="Save profile" />

      {mergeDiff && (
        <MergeDiffModal
          diff={mergeDiff}
          onApply={applyMerge}
          onCancel={cancelMerge}
          applying={saving}
        />
      )}
    </main>
  )
}
