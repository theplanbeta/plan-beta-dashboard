"use client"

import type { ReactNode } from "react"
import { Lock } from "lucide-react"

type Props = {
  languageLevel: string | null
  englishOk: boolean | null
  anerkennungRequired: string | null
  visaPathway: string | null
  anerkennungSupport: boolean | null
  visaSponsorship: boolean | null
  relocationSupport: string | null
  isPremium: boolean
}

const VISA_LABELS: Record<string, string> = {
  BLUE_CARD: "Blue Card",
  CHANCENKARTE: "Chancenkarte",
  PFLEGE_VISA: "Pflege-Visum",
  AUSBILDUNG: "Ausbildung",
  FSJ: "FSJ / BFD",
  EU_ONLY: "EU only",
  UNCLEAR: "Visa unclear",
}

const ANERKENNUNG_LABELS: Record<string, string> = {
  REQUIRED: "Anerkennung erforderlich",
  IN_PROGRESS_OK: "Anerkennung in progress OK",
  NOT_REQUIRED: "Keine Anerkennung nötig",
}

type Tone = "neutral" | "ok" | "warn"

/**
 * Lightweight tag in Amtlich (paper) styling — no rotation, no stamp halo.
 * Used in a flex-wrap row, so we can't reuse `.amtlich-stamp` (which tilts).
 */
function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  // Tone palette stays inside the Amtlich token system to avoid clashing
  // with the paper/manila aesthetic.
  const colorVar =
    tone === "ok"
      ? "var(--stamp-green, #2F7A3A)"
      : tone === "warn"
      ? "var(--manila-edge, #8C6618)"
      : "var(--ink-soft, #3A2B1C)"

  return (
    <span
      className="inline-flex items-center"
      style={{
        fontFamily: "var(--f-mono)",
        fontSize: "var(--fs-mono-xs)",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: colorVar,
        border: `1px solid ${colorVar}`,
        background: "var(--paper-cream, #F6EED5)",
        padding: "3px 8px",
        borderRadius: 3,
        lineHeight: 1.2,
      }}
    >
      {children}
    </span>
  )
}

function LockedBadge({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1"
      style={{
        fontFamily: "var(--f-mono)",
        fontSize: "var(--fs-mono-xs)",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--ink-faded, #6B5134)",
        border: "1px dashed var(--ink-faded, #6B5134)",
        background: "transparent",
        padding: "3px 8px",
        borderRadius: 3,
        lineHeight: 1.2,
      }}
      title="Upgrade to Premium to view"
    >
      <Lock size={10} strokeWidth={2} />
      {children} — upgrade
    </span>
  )
}

export function SignalBadges(props: Props) {
  const free: ReactNode[] = []

  if (props.languageLevel) {
    free.push(<Badge key="lang">{props.languageLevel} Deutsch</Badge>)
  }
  if (props.englishOk) {
    free.push(
      <Badge key="en" tone="ok">
        English OK
      </Badge>
    )
  }
  if (props.anerkennungRequired) {
    const tone: Tone =
      props.anerkennungRequired === "REQUIRED" ? "warn" : "ok"
    free.push(
      <Badge key="anerk" tone={tone}>
        {ANERKENNUNG_LABELS[props.anerkennungRequired] ?? props.anerkennungRequired}
      </Badge>
    )
  }
  if (props.visaPathway) {
    free.push(
      <Badge key="visa">
        {VISA_LABELS[props.visaPathway] ?? props.visaPathway}
      </Badge>
    )
  }

  const premium: ReactNode[] = []

  if (props.anerkennungSupport != null) {
    premium.push(
      props.isPremium ? (
        <Badge key="ansup" tone="ok">
          Anerkennung-Unterstützung
        </Badge>
      ) : (
        <LockedBadge key="ansup">Anerkennung-Unterstützung</LockedBadge>
      )
    )
  }
  if (props.visaSponsorship != null) {
    premium.push(
      props.isPremium ? (
        <Badge key="vs" tone="ok">
          Visa-Sponsoring
        </Badge>
      ) : (
        <LockedBadge key="vs">Visa-Sponsoring</LockedBadge>
      )
    )
  }
  if (props.relocationSupport) {
    premium.push(
      props.isPremium ? (
        <Badge key="rs" tone="ok">
          Relocation: {props.relocationSupport}
        </Badge>
      ) : (
        <LockedBadge key="rs">Relocation-Support</LockedBadge>
      )
    )
  }

  if (free.length === 0 && premium.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {free}
      {premium}
    </div>
  )
}
