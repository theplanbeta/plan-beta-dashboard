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
            <div className="flex justify-between items-center">
              <button
                type="button"
                className="flex-1 text-left bg-transparent border-0 p-0"
                onClick={() => setOpen(isOpen ? null : e.id)}
                aria-expanded={isOpen}
                aria-controls={`work-panel-${e.id}`}
              >
                <div className="font-medium">{e.title || "Untitled"} · {e.company || "Company"}</div>
                <div className="text-xs opacity-60">{e.from ?? "?"} — {e.to ?? "present"}</div>
              </button>
              <button type="button" onClick={() => remove(e.id)} aria-label="Remove entry" className="ml-2">
                <Trash2 size={14} />
              </button>
            </div>
            {isOpen && (
              <div id={`work-panel-${e.id}`} className="grid gap-2 mt-2">
                <label className="block text-xs opacity-70">
                  <span>Company</span>
                  <input value={e.company} onChange={(ev) => update(e.id, { company: ev.target.value })} className="border p-1 w-full mt-0.5" />
                </label>
                <label className="block text-xs opacity-70">
                  <span>Title</span>
                  <input value={e.title} onChange={(ev) => update(e.id, { title: ev.target.value })} className="border p-1 w-full mt-0.5" />
                </label>
                <div className="flex gap-2">
                  <label className="block text-xs opacity-70 flex-1">
                    <span>From</span>
                    <input value={e.from ?? ""} onChange={(ev) => update(e.id, { from: ev.target.value || null })} placeholder="e.g. 2021" className="border p-1 w-full mt-0.5" />
                  </label>
                  <label className="block text-xs opacity-70 flex-1">
                    <span>To</span>
                    <input value={e.to ?? ""} onChange={(ev) => update(e.id, { to: ev.target.value || null })} placeholder='or "present"' className="border p-1 w-full mt-0.5" />
                  </label>
                </div>
                <label className="block text-xs opacity-70">
                  <span>Description</span>
                  <textarea value={e.description ?? ""} onChange={(ev) => update(e.id, { description: ev.target.value || null })} className="border p-1 w-full mt-0.5" rows={3} />
                </label>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
