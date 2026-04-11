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
// Stage metadata
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
  SAVED: "Saved",
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
}

export const STAGE_BADGE_CLASSES: Record<string, string> = {
  SAVED: "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200",
  APPLIED: "bg-yellow-100 text-yellow-800 ring-1 ring-inset ring-yellow-200",
  SCREENING: "bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-200",
  INTERVIEW: "bg-purple-100 text-purple-800 ring-1 ring-inset ring-purple-200",
  OFFER: "bg-green-100 text-green-800 ring-1 ring-inset ring-green-200",
  ACCEPTED: "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200",
  REJECTED: "bg-red-100 text-red-800 ring-1 ring-inset ring-red-200",
  WITHDRAWN: "bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-200",
}

const STAGE_DOT_CLASSES: Record<string, string> = {
  SAVED: "bg-gray-400",
  APPLIED: "bg-yellow-500",
  SCREENING: "bg-blue-500",
  INTERVIEW: "bg-purple-500",
  OFFER: "bg-green-500",
  ACCEPTED: "bg-emerald-500",
  REJECTED: "bg-red-500",
  WITHDRAWN: "bg-gray-400",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StageSelector({
  currentStage,
  onChange,
  disabled = false,
}: StageSelectorProps) {
  const currentLabel = STAGE_LABELS[currentStage] ?? currentStage
  const currentClasses =
    STAGE_BADGE_CLASSES[currentStage] ?? STAGE_BADGE_CLASSES.SAVED

  return (
    <Menu as="div" className="relative inline-block text-left">
      <MenuButton
        disabled={disabled}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity ${currentClasses} ${
          disabled ? "cursor-not-allowed opacity-60" : "hover:opacity-90"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {currentLabel}
        <ChevronDown className="h-3 w-3" />
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        className="z-50 mt-1 w-40 origin-top-right rounded-lg border border-gray-200 bg-white py-1 shadow-lg focus:outline-none"
      >
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
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                    focus ? "bg-gray-50" : ""
                  } ${isActive ? "font-semibold text-gray-900" : "text-gray-700"}`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${STAGE_DOT_CLASSES[stage]}`}
                  />
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
