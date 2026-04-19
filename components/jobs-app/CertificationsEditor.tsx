"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"

export interface CertEntry {
  id: string
  name: string
  issuer: string | null
  year: string | null
}

interface Props {
  value: CertEntry[]
  onChange: (entries: CertEntry[]) => void
}

export function CertificationsEditor({ value, onChange }: Props) {
  const [open, setOpen] = useState<string | null>(null)
  function update(id: string, patch: Partial<CertEntry>) {
    onChange(value.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">Certifications</h3>
        <button type="button" onClick={() => {
          const entry: CertEntry = { id: crypto.randomUUID(), name: "", issuer: null, year: null }
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
                aria-controls={`cert-panel-${e.id}`}
              >
                <div className="font-medium">{e.name || "Certification"}</div>
                <div className="text-xs opacity-60">{e.issuer ?? ""} · {e.year ?? ""}</div>
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
              <div id={`cert-panel-${e.id}`} className="grid gap-2 mt-2">
                <label className="block text-xs opacity-70">
                  <span>Name</span>
                  <input value={e.name} onChange={(ev) => update(e.id, { name: ev.target.value })} className="border p-1 w-full mt-0.5" />
                </label>
                <label className="block text-xs opacity-70">
                  <span>Issuer</span>
                  <input value={e.issuer ?? ""} onChange={(ev) => update(e.id, { issuer: ev.target.value || null })} className="border p-1 w-full mt-0.5" />
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
