"use client"

import { useEffect, useState } from "react"
import { SOCIAL_PROOF } from "@/lib/marketing-constants"

type Variant = "nurse" | "general"

interface Props {
  variant?: Variant
  // Optional override for the "students learning German" count.
  // Pass from a Server Component that queried the DB if you want live numbers.
  studentCount?: number
}

const STORAGE_KEY_PREFIX = "pb-proof-dismissed-"
const SUPPRESS_DAYS = 30

function safeReadDismissed(variant: Variant): boolean {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${variant}`)
    if (!raw) return false
    const dismissedAt = parseInt(raw, 10)
    if (Number.isNaN(dismissedAt)) return false
    const ageMs = Date.now() - dismissedAt
    return ageMs < SUPPRESS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    // localStorage unavailable (private mode, disabled, etc.) — show the bar.
    return false
  }
}

function safeWriteDismissed(variant: Variant) {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${variant}`, Date.now().toString())
  } catch {
    /* no-op */
  }
}

export function SocialProofBar({ variant = "general", studentCount }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Defer visibility check to client so SSR + client agree
    setVisible(!safeReadDismissed(variant))
  }, [variant])

  if (!visible) return null

  const items =
    variant === "nurse"
      ? [
          { label: `${SOCIAL_PROOF.nursesPlaced} nurses placed in German hospitals`, emoji: "🏥" },
          { label: "No agency fees — refundable deposit", emoji: "✅" },
          { label: `WhatsApp reply within ${SOCIAL_PROOF.whatsAppReplyHours} hours`, emoji: "💬" },
        ]
      : [
          {
            label: `${(studentCount ?? SOCIAL_PROOF.studentsFallback).toLocaleString()}+ students learning German with us`,
            emoji: "🎓",
          },
          { label: "Live A1–B2 batches · Goethe-certified pathway", emoji: "📚" },
          { label: `WhatsApp reply within ${SOCIAL_PROOF.whatsAppReplyHours} hours`, emoji: "💬" },
        ]

  return (
    <div
      role="region"
      aria-label="Plan Beta social proof"
      className="bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-100"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3">
        <div className="flex-1 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs sm:text-sm">
          {items.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true">{item.emoji}</span>
              <span>{item.label}</span>
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            safeWriteDismissed(variant)
            setVisible(false)
          }}
          aria-label="Dismiss this notice"
          className="shrink-0 text-emerald-200/80 hover:text-white p-1 -m-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
