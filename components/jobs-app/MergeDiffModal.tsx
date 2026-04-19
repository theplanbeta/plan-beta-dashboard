"use client"

import type { WorkEntry } from "./WorkExperienceEditor"
import type { EducationEntry } from "./EducationEditor"
import type { CertEntry } from "./CertificationsEditor"

export interface MergeDiffData {
  workExperience: { added: WorkEntry[]; matched: WorkEntry[] }
  skills: { addedTechnical: string[]; addedLanguages: string[]; addedSoft: string[] }
  educationDetails: { added: EducationEntry[]; matched: EducationEntry[] }
  certifications: { added: CertEntry[]; matched: CertEntry[] }
  scalarChanges: Record<string, { before: unknown; after: unknown }>
  preservedFromManualEdits: string[]
}

interface Props {
  diff: MergeDiffData
  onApply: () => void
  onCancel: () => void
  applying?: boolean
}

export function MergeDiffModal({ diff, onApply, onCancel, applying }: Props) {
  const addedWorkCount = diff.workExperience.added.length
  const addedSkillsCount = diff.skills.addedTechnical.length + diff.skills.addedLanguages.length + diff.skills.addedSoft.length
  const addedEduCount = diff.educationDetails.added.length
  const addedCertCount = diff.certifications.added.length
  const scalarCount = Object.keys(diff.scalarChanges).length
  const preservedCount = diff.preservedFromManualEdits.length

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded max-w-lg w-full p-6 space-y-4">
        <h2 className="text-lg font-semibold">We updated your profile with new data</h2>
        <ul className="text-sm space-y-1">
          {addedWorkCount > 0 && <li>+ {addedWorkCount} new work experience{addedWorkCount === 1 ? "" : "s"}</li>}
          {addedSkillsCount > 0 && <li>+ {addedSkillsCount} new skill{addedSkillsCount === 1 ? "" : "s"}</li>}
          {addedEduCount > 0 && <li>+ {addedEduCount} new education entr{addedEduCount === 1 ? "y" : "ies"}</li>}
          {addedCertCount > 0 && <li>+ {addedCertCount} new certification{addedCertCount === 1 ? "" : "s"}</li>}
          {scalarCount > 0 && <li>• {scalarCount} profile detail{scalarCount === 1 ? "" : "s"} updated</li>}
          {preservedCount > 0 && <li className="opacity-60">✓ {preservedCount} manual edit{preservedCount === 1 ? "" : "s"} preserved</li>}
        </ul>
        {addedWorkCount === 0 && addedSkillsCount === 0 && addedEduCount === 0 && addedCertCount === 0 && scalarCount === 0 && (
          <p className="opacity-60 text-sm">Nothing new to add. Everything in the uploaded CV is already in your profile.</p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={applying}>Cancel</button>
          <button type="button" onClick={onApply} disabled={applying} className="bg-black text-white px-4 py-2 rounded">
            {applying ? "Applying…" : "Apply changes"}
          </button>
        </div>
      </div>
    </div>
  )
}
