"use client"

import { trackEvent } from "@/lib/tracking"

interface NicheConversionCardProps {
  niche: "nursing" | "engineering" | "student-jobs"
}

const NICHE_CONVERSION: Record<string, { headline: string; subtext: string; waMessage: string; secondaryCta: { label: string; href: string } }> = {
  nursing: {
    headline: "We place 100% of our B2-certified nurses in German hospitals.",
    subtext: "No placement fees. Plan Beta handles everything: A1→B2 training, Anerkennung, and hospital placement.",
    waMessage: "Hi! I'm interested in Plan Beta's nursing pathway to Germany. Can you tell me about the training, recognition, and placement process?",
    secondaryCta: { label: "See Nursing Program", href: "/nurses" },
  },
  engineering: {
    headline: "Your engineering career in Germany starts with German.",
    subtext: "A1 → B2 in 12-14 months. Live online classes that fit around your work schedule.",
    waMessage: "Hi! I'm an engineer interested in learning German to work in Germany. What's the course timeline?",
    secondaryCta: { label: "Check Eligibility", href: "/germany-pathway" },
  },
  "student-jobs": {
    headline: "Spotted a job that needs better German?",
    subtext: "We teach A1-B2 live online. Better German = better-paying student jobs.",
    waMessage: "Hi! I'm a student in Germany and want to improve my German for better job opportunities. What courses do you offer?",
    secondaryCta: { label: "View Courses", href: "/courses" },
  },
}

export function NicheConversionCard({ niche }: NicheConversionCardProps) {
  const content = NICHE_CONVERSION[niche]
  if (!content) return null

  const waUrl = `https://wa.me/919028396035?text=${encodeURIComponent(content.waMessage)}`

  return (
    <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/20 rounded-2xl p-8 text-center">
      <h3 className="text-xl font-bold text-white mb-2">{content.headline}</h3>
      <p className="text-gray-400 text-sm mb-6 max-w-lg mx-auto">{content.subtext}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("conversion_card_wa_click", { niche })}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-all shadow-lg shadow-green-600/25"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Talk to Us on WhatsApp
        </a>
        <a
          href={content.secondaryCta.href}
          onClick={() => trackEvent("conversion_card_secondary_click", { niche })}
          className="inline-flex items-center justify-center px-6 py-3 bg-white/5 border border-white/10 text-gray-300 font-medium rounded-full hover:bg-white/10 transition-all"
        >
          {content.secondaryCta.label}
        </a>
      </div>
    </div>
  )
}
