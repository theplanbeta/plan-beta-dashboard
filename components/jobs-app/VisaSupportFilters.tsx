"use client"

import { useCallback } from "react"

export type VisaSupportState = {
  anerkennungSupport: boolean | null
  visaSponsorship: boolean | null
  relocationSupport: boolean | null
}

export const EMPTY_VISA_SUPPORT_STATE: VisaSupportState = {
  anerkennungSupport: null,
  visaSponsorship: null,
  relocationSupport: null,
}

interface Props {
  value: VisaSupportState
  onChange: (next: VisaSupportState) => void
}

const OPTIONS: Array<{
  key: keyof VisaSupportState
  label: string
}> = [
  { key: "anerkennungSupport", label: "Anerkennung-Unterstützung" },
  { key: "visaSponsorship", label: "Visa-Sponsoring" },
  { key: "relocationSupport", label: "Relocation-Support" },
]

export function VisaSupportFilters({ value, onChange }: Props) {
  const toggle = useCallback(
    (key: keyof VisaSupportState) => {
      onChange({ ...value, [key]: value[key] === true ? null : true })
    },
    [value, onChange]
  )

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="mono" style={{ fontSize: "var(--fs-mono-xs)" }}>
          Visa &amp; support
        </span>
        <span
          className="mono"
          style={{
            fontSize: "var(--fs-mono-xs)",
            color: "var(--ink-faded)",
          }}
        >
          Premium
        </span>
      </div>

      <div className="space-y-1.5">
        {OPTIONS.map((opt) => (
          <label
            key={opt.key}
            className="flex items-center gap-2"
            style={{ cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={value[opt.key] === true}
              onChange={() => toggle(opt.key)}
            />
            <span
              style={{
                fontFamily: "var(--f-body)",
                fontSize: "0.9rem",
                color: "var(--ink)",
              }}
            >
              {opt.label}
            </span>
          </label>
        ))}
      </div>
    </section>
  )
}
