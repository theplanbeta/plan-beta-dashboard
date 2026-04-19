"use client"

import { WorkExperienceEditor, type WorkEntry } from "./WorkExperienceEditor"
import { SkillsChipEditor, type SkillsValue } from "./SkillsChipEditor"
import { EducationEditor, type EducationEntry } from "./EducationEditor"
import { CertificationsEditor, type CertEntry } from "./CertificationsEditor"

export interface ProfileEditorValue {
  firstName: string | null
  lastName: string | null
  currentJobTitle: string | null
  yearsOfExperience: number | null
  workExperience: WorkEntry[]
  skills: SkillsValue
  educationDetails: EducationEntry[]
  certifications: CertEntry[]
}

interface Props {
  value: ProfileEditorValue
  onChange: (next: ProfileEditorValue) => void
  onSave: () => Promise<void>
  saving?: boolean
  saveLabel?: string
}

export function ProfileEditor({ value, onChange, onSave, saving, saveLabel = "Save" }: Props) {
  function patch<K extends keyof ProfileEditorValue>(key: K, v: ProfileEditorValue[K]) {
    onChange({ ...value, [key]: v })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold">Basics</h3>
        <div className="flex gap-2">
          <label className="block text-xs opacity-70 flex-1">
            <span>First name</span>
            <input
              value={value.firstName ?? ""}
              onChange={(e) => patch("firstName", e.target.value || null)}
              className="border p-1 w-full mt-0.5"
              autoComplete="given-name"
            />
          </label>
          <label className="block text-xs opacity-70 flex-1">
            <span>Last name</span>
            <input
              value={value.lastName ?? ""}
              onChange={(e) => patch("lastName", e.target.value || null)}
              className="border p-1 w-full mt-0.5"
              autoComplete="family-name"
            />
          </label>
        </div>
        <label className="block text-xs opacity-70">
          <span>Current job title</span>
          <input
            value={value.currentJobTitle ?? ""}
            onChange={(e) => patch("currentJobTitle", e.target.value || null)}
            className="border p-1 w-full mt-0.5"
          />
        </label>
        <label className="block text-xs opacity-70">
          <span>Years of experience</span>
          <input
            type="number"
            min={0}
            max={60}
            value={value.yearsOfExperience ?? ""}
            onChange={(e) => patch("yearsOfExperience", e.target.value === "" ? null : parseInt(e.target.value, 10))}
            className="border p-1 w-full mt-0.5"
          />
        </label>
      </div>

      <WorkExperienceEditor value={value.workExperience} onChange={(v) => patch("workExperience", v)} />
      <SkillsChipEditor value={value.skills} onChange={(v) => patch("skills", v)} />
      <EducationEditor value={value.educationDetails} onChange={(v) => patch("educationDetails", v)} />
      <CertificationsEditor value={value.certifications} onChange={(v) => patch("certifications", v)} />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="bg-black text-white px-4 py-2 rounded"
        >
          {saving ? "Saving…" : saveLabel}
        </button>
      </div>
    </div>
  )
}
