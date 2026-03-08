"use client"

import { trackEvent } from "@/lib/tracking"

interface GermanLevelGapBannerProps {
  niche: "nursing" | "engineering" | "student-jobs"
  jobCount: number
}

const NICHE_MESSAGING: Record<string, { headline: string; subtext: string; waMessage: string }> = {
  nursing: {
    headline: "These jobs need B2 German.",
    subtext: "We train you from A1→B2, handle your Anerkennung, and place you in a German hospital.",
    waMessage: "Hi! I'm a nurse interested in your complete pathway — German training, Anerkennung, and placement in Germany. Can you tell me more?",
  },
  engineering: {
    headline: "Most engineering jobs need B1-B2 German.",
    subtext: "We train you from scratch in 8-12 months. Blue Card guidance included.",
    waMessage: "Hi! I'm an engineer interested in working in Germany. I need to learn German — can you help me plan my pathway?",
  },
  "student-jobs": {
    headline: "Higher German = higher-paying jobs.",
    subtext: "Level up from A2→B1 or B1→B2 with Plan Beta's live online courses.",
    waMessage: "Hi! I'm a student in Germany looking to improve my German for better job opportunities. What courses do you offer?",
  },
}

export function GermanLevelGapBanner({ niche, jobCount }: GermanLevelGapBannerProps) {
  const messaging = NICHE_MESSAGING[niche]
  if (!messaging) return null

  const waUrl = `https://wa.me/919028396035?text=${encodeURIComponent(messaging.waMessage)}`

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-lg mb-1">
            {messaging.headline}
          </p>
          <p className="text-gray-400 text-sm">
            {messaging.subtext}
          </p>
          {jobCount > 0 && (
            <p className="text-gray-500 text-xs mt-2">
              {jobCount} active {niche === "student-jobs" ? "student" : niche} jobs in Germany right now
            </p>
          )}
        </div>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("gap_banner_wa_click", { niche })}
          className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-full hover:bg-green-700 transition-all shadow-lg shadow-green-600/25"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Talk to Us
        </a>
      </div>
    </div>
  )
}
