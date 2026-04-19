"use client"

import { useState } from "react"
import { Share2 } from "lucide-react"
import { shareOrFallback } from "@/lib/share-links"

interface Props {
  text: string
  url: string
  label?: string
  className?: string
  iconSize?: number
}

export function ShareButton({ text, url, label = "Share", className, iconSize = 14 }: Props) {
  const [sharing, setSharing] = useState(false)
  return (
    <button
      type="button"
      disabled={sharing}
      onClick={async () => {
        setSharing(true)
        try {
          await shareOrFallback({ text, url })
        } finally {
          setSharing(false)
        }
      }}
      className={className ?? "amtlich-btn inline-flex items-center gap-2"}
      aria-label={`${label} via WhatsApp or share sheet`}
    >
      <Share2 size={iconSize} strokeWidth={2.2} />
      {sharing ? "Opening…" : label}
    </button>
  )
}
