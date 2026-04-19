"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"

export interface EducationEntry {
  id: string
  institution: string
  degree: string | null
  field: string | null
  year: string | null
}

interface Props {
  value: EducationEntry[]
  onChange: (entries: EducationEntry[]) => void
}

export function EducationEditor({ value, onChange }: Props) {
  const [open, setOpen] = useState<string | null>(null)
  function update(id: string, patch: Partial<EducationEntry>) {
    onChange(value.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">Education</h3>
        <button type="button" onClick={() => {
          const entry: EducationEntry = { id: crypto.randomUUID(), institution: "", degree: null, field: null, year: null }
          onChange([...value, entry])
          setOpen(entry.id)
        }} className="text-sm flex items-center gap-1"><Plus size={14} /> Add</button>
      </div>
      {value.map((e) => {
        const isOpen = open === e.id
        return (
          <div key={e.id} className="border rounded p-2">
            <div className="flex justify-between items-center">
              <button
                type="button"
                className="flex-1 text-left bg-transparent border-0 p-0"
                onClick={() => setOpen(isOpen ? null : e.id)}
                aria-expanded={isOpen}
                aria-controls={`edu-panel-${e.id}`}
              >
                <div className="font-medium">{e.institution || "Institution"}</div>
                <div className="text-xs opacity-60">{e.degree ?? "?"} · {e.field ?? "?"} · {e.year ?? ""}</div>
              </button>
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x.id !== e.id))}
                aria-label="Remove entry"
                className="ml-2"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {isOpen && (
              <div id={`edu-panel-${e.id}`} className="grid gap-2 mt-2">
                <label className="block text-xs opacity-70">
                  <span>Institution</span>
                  <input value={e.institution} onChange={(ev) => update(e.id, { institution: ev.target.value })} className="border p-1 w-full mt-0.5" />
                </label>
                <label className="block text-xs opacity-70">
                  <span>Degree</span>
                  <input value={e.degree ?? ""} onChange={(ev) => update(e.id, { degree: ev.target.value || null })} className="border p-1 w-full mt-0.5" />
                </label>
                <label className="block text-xs opacity-70">
                  <span>Field of study</span>
                  <input value={e.field ?? ""} onChange={(ev) => update(e.id, { field: ev.target.value || null })} className="border p-1 w-full mt-0.5" />
                </label>
                <label className="block text-xs opacity-70">
                  <span>Year</span>
                  <input value={e.year ?? ""} onChange={(ev) => update(e.id, { year: ev.target.value || null })} className="border p-1 w-full mt-0.5" />
                </label>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
