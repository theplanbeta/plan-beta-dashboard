"use client"

import { useState } from "react"
import { X } from "lucide-react"

export interface SkillsValue {
  technical: string[]
  languages: string[]
  soft: string[]
}

interface Props {
  value: SkillsValue
  onChange: (skills: SkillsValue) => void
}

function ChipList({ items, onRemove, onAdd, label }: { items: string[]; onRemove: (idx: number) => void; onAdd: (val: string) => void; label: string }) {
  const [input, setInput] = useState("")
  return (
    <div>
      <div className="text-xs uppercase opacity-60 mb-1">{label}</div>
      <div className="flex flex-wrap gap-1 mb-1">
        {items.map((s, i) => (
          <span key={`${s}-${i}`} className="text-xs px-2 py-1 bg-gray-100 rounded flex items-center gap-1">
            {s}
            <button onClick={() => onRemove(i)} aria-label={`Remove ${s}`}><X size={10} /></button>
          </span>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && input.trim()) {
            e.preventDefault()
            onAdd(input.trim())
            setInput("")
          }
        }}
        placeholder={`Add ${label.toLowerCase()} and press Enter`}
        className="border p-1 text-sm w-full"
      />
    </div>
  )
}

export function SkillsChipEditor({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Skills</h3>
      <ChipList
        label="Technical"
        items={value.technical}
        onAdd={(s) => onChange({ ...value, technical: [...value.technical, s] })}
        onRemove={(i) => onChange({ ...value, technical: value.technical.filter((_, idx) => idx !== i) })}
      />
      <ChipList
        label="Languages"
        items={value.languages}
        onAdd={(s) => onChange({ ...value, languages: [...value.languages, s] })}
        onRemove={(i) => onChange({ ...value, languages: value.languages.filter((_, idx) => idx !== i) })}
      />
      <ChipList
        label="Soft"
        items={value.soft}
        onAdd={(s) => onChange({ ...value, soft: [...value.soft, s] })}
        onRemove={(i) => onChange({ ...value, soft: value.soft.filter((_, idx) => idx !== i) })}
      />
    </div>
  )
}
