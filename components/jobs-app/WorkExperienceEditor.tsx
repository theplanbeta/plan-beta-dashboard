"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"

export interface WorkEntry {
  id: string
  company: string
  title: string
  from: string | null
  to: string | null
  description: string | null
}

interface Props {
  value: WorkEntry[]
  onChange: (entries: WorkEntry[]) => void
}

export function WorkExperienceEditor({ value, onChange }: Props) {
  const [open, setOpen] = useState<string | null>(value[0]?.id ?? null)

  function update(id: string, patch: Partial<WorkEntry>) {
    onChange(value.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  function remove(id: string) {
    onChange(value.filter((e) => e.id !== id))
  }

  function add() {
    const entry: WorkEntry = { id: crypto.randomUUID(), company: "", title: "", from: null, to: null, description: null }
    onChange([...value, entry])
    setOpen(entry.id)
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">Work Experience</h3>
        <button type="button" onClick={add} className="text-sm flex items-center gap-1">
          <Plus size={14} /> Add
        </button>
      </div>
      {value.length === 0 && <p className="text-sm opacity-60">No entries. Add one with the button above.</p>}
      {value.map((e) => {
        const isOpen = open === e.id
        return (
          <div key={e.id} className="border rounded p-2">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setOpen(isOpen ? null : e.id)}>
              <div>
                <div className="font-medium">{e.title || "Untitled"} · {e.company || "Company"}</div>
                <div className="text-xs opacity-60">{e.from ?? "?"} — {e.to ?? "present"}</div>
              </div>
              <button type="button" onClick={(ev) => { ev.stopPropagation(); remove(e.id) }} aria-label="Remove entry">
                <Trash2 size={14} />
              </button>
            </div>
            {isOpen && (
              <div className="grid gap-2 mt-2">
                <input value={e.company} onChange={(ev) => update(e.id, { company: ev.target.value })} placeholder="Company" className="border p-1" />
                <input value={e.title} onChange={(ev) => update(e.id, { title: ev.target.value })} placeholder="Title" className="border p-1" />
                <div className="flex gap-2">
                  <input value={e.from ?? ""} onChange={(ev) => update(e.id, { from: ev.target.value || null })} placeholder="From (e.g. 2021)" className="border p-1 flex-1" />
                  <input value={e.to ?? ""} onChange={(ev) => update(e.id, { to: ev.target.value || null })} placeholder='To (or "present")' className="border p-1 flex-1" />
                </div>
                <textarea value={e.description ?? ""} onChange={(ev) => update(e.id, { description: ev.target.value || null })} placeholder="Description" className="border p-1" rows={3} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
