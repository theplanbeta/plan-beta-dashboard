"use client"

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react"
import { ChevronDown } from "lucide-react"

interface StageSelectorProps {
  currentStage: string
  onChange: (newStage: string) => void
  disabled?: boolean
}

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
  SAVED: "Saved",
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
}

export const STAGE_STAMP_VARIANT: Record<string, string> = {
  SAVED: "amtlich-stamp--ink",
  APPLIED: "amtlich-stamp--ink",
  SCREENING: "amtlich-stamp--teal",
  INTERVIEW: "amtlich-stamp--blue",
  OFFER: "amtlich-stamp--green",
  ACCEPTED: "amtlich-stamp--green",
  REJECTED: "",   // default red
  WITHDRAWN: "amtlich-stamp--ink",
}

export const STAGE_BADGE_CLASSES: Record<string, string> = STAGE_STAMP_VARIANT

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
            fontSize: "var(--fs-mono-xs)",
            padding: "4px 10px",
          }}
        >
          {currentLabel}
        </span>
        <ChevronDown
          size={12}
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
          <span className="mono" style={{ fontSize: "var(--fs-mono-xs)" }}>
            Change status
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
                    fontSize: "var(--fs-mono-sm)",
                    letterSpacing: "0.06em",
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
