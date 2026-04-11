"use client"

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react"
import { ChevronDown } from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StageSelectorProps {
  currentStage: string
  onChange: (newStage: string) => void
  disabled?: boolean
}

// ---------------------------------------------------------------------------
// Stage metadata — German bureaucratic labels
// ---------------------------------------------------------------------------

const STAGES = [
  "SAVED",
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
] as const

export const STAGE_LABELS: Record<string, string> = {
  SAVED: "Gespeichert",
  APPLIED: "Eingereicht",
  SCREENING: "Prüfung",
  INTERVIEW: "Gespräch",
  OFFER: "Angebot",
  ACCEPTED: "Angenommen",
  REJECTED: "Absage",
  WITHDRAWN: "Zurückgezogen",
}

/**
 * Each stage gets its own rubber-stamp style variant class.
 * Uses the `.amtlich-stamp` base from amtlich.css with color modifiers.
 */
export const STAGE_STAMP_VARIANT: Record<string, string> = {
  SAVED: "amtlich-stamp--ink",
  APPLIED: "amtlich-stamp--ink",
  SCREENING: "amtlich-stamp--blue",
  INTERVIEW: "amtlich-stamp--blue",
  OFFER: "amtlich-stamp--green",
  ACCEPTED: "amtlich-stamp--green",
  REJECTED: "",
  WITHDRAWN: "amtlich-stamp--ink",
}

// Backwards-compat export (some older code imports this)
export const STAGE_BADGE_CLASSES: Record<string, string> = STAGE_STAMP_VARIANT

// ---------------------------------------------------------------------------
// Component — stage shown as a tilted rubber stamp, dropdown opens a ledger
// ---------------------------------------------------------------------------

export default function StageSelector({
  currentStage,
  onChange,
  disabled = false,
}: StageSelectorProps) {
  const currentLabel = STAGE_LABELS[currentStage] ?? currentStage
  const stampVariant = STAGE_STAMP_VARIANT[currentStage] ?? ""

  return (
    <Menu as="div" className="relative inline-block text-left">
      <MenuButton
        disabled={disabled}
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-1 transition-opacity ${
          disabled ? "cursor-not-allowed opacity-60" : "hover:opacity-95"
        }`}
        style={{ background: "transparent", border: "none", padding: 0 }}
      >
        <span
          className={`amtlich-stamp ${stampVariant}`}
          style={{
            transform: "rotate(-1.5deg)",
            fontSize: "0.6rem",
            padding: "4px 10px",
          }}
        >
          {currentLabel}
        </span>
        <ChevronDown
          size={11}
          strokeWidth={2}
          style={{ color: "var(--ink-faded)" }}
        />
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        className="amtlich-card z-50 mt-2 w-48 origin-top-right focus:outline-none"
        style={{ padding: "8px 4px" }}
      >
        <div className="mb-2 px-2">
          <span className="mono" style={{ fontSize: "0.58rem" }}>
            Stand ändern
          </span>
        </div>
        {STAGES.map((stage) => {
          const isActive = stage === currentStage
          return (
            <MenuItem key={stage}>
              {({ focus }) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!isActive) onChange(stage)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left"
                  style={{
                    fontFamily: "var(--f-mono)",
                    fontSize: "0.68rem",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "var(--ink)" : "var(--ink-soft)",
                    background: focus
                      ? "rgba(255, 250, 220, 0.55)"
                      : "transparent",
                    borderRadius: "2px",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "6px",
                      textAlign: "center",
                      color: "var(--ink-faded)",
                    }}
                  >
                    {isActive ? "●" : "○"}
                  </span>
                  {STAGE_LABELS[stage]}
                </button>
              )}
            </MenuItem>
          )
        })}
      </MenuItems>
    </Menu>
  )
}
