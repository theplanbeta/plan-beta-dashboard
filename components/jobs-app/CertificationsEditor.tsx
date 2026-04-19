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
            <div className="flex justify-between cursor-pointer" onClick={() => setOpen(isOpen ? null : e.id)}>
              <div>
                <div className="font-medium">{e.name || "Certification"}</div>
                <div className="text-xs opacity-60">{e.issuer ?? ""} · {e.year ?? ""}</div>
              </div>
              <button type="button" onClick={(ev) => { ev.stopPropagation(); onChange(value.filter((x) => x.id !== e.id)) }}><Trash2 size={14} /></button>
            </div>
            {isOpen && (
              <div className="grid gap-2 mt-2">
                <input value={e.name} onChange={(ev) => update(e.id, { name: ev.target.value })} placeholder="Name" className="border p-1" />
                <input value={e.issuer ?? ""} onChange={(ev) => update(e.id, { issuer: ev.target.value || null })} placeholder="Issuer" className="border p-1" />
                <input value={e.year ?? ""} onChange={(ev) => update(e.id, { year: ev.target.value || null })} placeholder="Year" className="border p-1" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
