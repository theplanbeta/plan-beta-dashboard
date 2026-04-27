"use client"

import { useCallback } from "react"

export type MigrantFitState = {
  languageLevels: string[]    // multi-select: A1..C2, NONE
  englishOk: boolean | null   // tri: true / null
  anerkennung: string[]       // multi: REQUIRED, IN_PROGRESS_OK, NOT_REQUIRED
  visaPathways: string[]      // multi: BLUE_CARD, CHANCENKARTE, ...
}

export const EMPTY_MIGRANT_FIT_STATE: MigrantFitState = {
  languageLevels: [],
  englishOk: null,
  anerkennung: [],
  visaPathways: [],
}

const LANGUAGE_OPTIONS = [
  { value: "A1", label: "A1" },
  { value: "A2", label: "A2" },
  { value: "B1", label: "B1" },
  { value: "B2", label: "B2" },
  { value: "C1", label: "C1" },
  { value: "C2", label: "C2" },
  { value: "NONE", label: "Keine Angabe" },
]

const ANERKENNUNG_OPTIONS = [
  { value: "REQUIRED", label: "Erforderlich" },
  { value: "IN_PROGRESS_OK", label: "In Bearbeitung OK" },
  { value: "NOT_REQUIRED", label: "Nicht erforderlich" },
]

// Schema enum has 7 values; we expose 5. EU_ONLY is intentionally hidden
// (excludes non-EU migrants — this tool's audience). UNCLEAR is a fallback
// label, not a category users should filter by.
const VISA_OPTIONS = [
  { value: "BLUE_CARD", label: "Blue Card" },
  { value: "CHANCENKARTE", label: "Chancenkarte" },
  { value: "PFLEGE_VISA", label: "Pflege-Visum" },
  { value: "AUSBILDUNG", label: "Ausbildung" },
  { value: "FSJ", label: "FSJ / BFD" },
]

interface Props {
  value: MigrantFitState
  onChange: (next: MigrantFitState) => void
}

export function MigrantFitFilters({ value, onChange }: Props) {
  const toggle = useCallback(
    (key: "languageLevels" | "anerkennung" | "visaPathways", option: string) => {
      const current = value[key]
      const next = current.includes(option)
        ? current.filter((v) => v !== option)
        : [...current, option]
      onChange({ ...value, [key]: next })
    },
    [value, onChange]
  )

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="mono" style={{ fontSize: "var(--fs-mono-xs)" }}>
          Migrant fit
        </span>
        <span
          className="mono"
          style={{
            fontSize: "var(--fs-mono-xs)",
            color: "var(--ink-faded)",
          }}
        >
          Free
        </span>
      </div>

      {/* Sprachniveau — chip toggles */}
      <div>
        <p
          className="mono mb-2"
          style={{
            fontSize: "var(--fs-mono-xs)",
            color: "var(--ink-faded)",
          }}
        >
          Sprachniveau
        </p>
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGE_OPTIONS.map((opt) => {
            const active = value.languageLevels.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle("languageLevels", opt.value)}
                aria-pressed={active}
                className="mono"
                style={{
                  fontSize: "var(--fs-mono-xs)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "5px 10px",
                  borderRadius: "3px",
                  border: active
                    ? "1px solid var(--ink)"
                    : "1px solid var(--manila-edge)",
                  background: active ? "var(--ink)" : "#fbf4dc",
                  color: active ? "#fdf6de" : "var(--ink)",
                  cursor: "pointer",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* English-friendly toggle */}
      <div>
        <label
          className="flex items-center gap-2"
          style={{ cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={value.englishOk === true}
            onChange={(e) =>
              onChange({
                ...value,
                englishOk: e.target.checked ? true : null,
              })
            }
          />
          <span
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.92rem",
              color: "var(--ink)",
            }}
          >
            English-friendly only
          </span>
        </label>
      </div>

      {/* Anerkennung — checkbox list */}
      <div>
        <p
          className="mono mb-2"
          style={{
            fontSize: "var(--fs-mono-xs)",
            color: "var(--ink-faded)",
          }}
        >
          Anerkennung
        </p>
        <div className="space-y-1.5">
          {ANERKENNUNG_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2"
              style={{ cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={value.anerkennung.includes(opt.value)}
                onChange={() => toggle("anerkennung", opt.value)}
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
      </div>

      {/* Visa pathway — checkbox list */}
      <div>
        <p
          className="mono mb-2"
          style={{
            fontSize: "var(--fs-mono-xs)",
            color: "var(--ink-faded)",
          }}
        >
          Visa-Weg
        </p>
        <div className="space-y-1.5">
          {VISA_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2"
              style={{ cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={value.visaPathways.includes(opt.value)}
                onChange={() => toggle("visaPathways", opt.value)}
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
      </div>
    </section>
  )
}
