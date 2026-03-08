"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { trackEvent } from "@/lib/tracking"

interface JobShareButtonProps {
  job: {
    id: string
    title: string
    company: string
    location?: string | null
  }
  niche: "nursing" | "engineering" | "student-jobs"
}

const NICHE_LABELS: Record<string, string> = {
  nursing: "nursing",
  engineering: "engineering",
  "student-jobs": "student",
}

export function JobShareButton({ job, niche }: JobShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const nicheLabel = NICHE_LABELS[niche] || niche

  const shareUrl = `https://theplanbeta.com/jobs/${niche}?highlight=${job.id}&utm_source=link&utm_medium=share&utm_campaign=job_share`

  const waText = `Check out this ${nicheLabel} job in Germany!\n\n${job.title} at ${job.company}${job.location ? ` in ${job.location}` : ""}\n\nSee more jobs: https://theplanbeta.com/jobs/${niche}?utm_source=whatsapp&utm_medium=share&utm_campaign=job_share`

  const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`

  // Close dropdown on outside click
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open, handleClickOutside])

  function handleWhatsApp() {
    trackEvent("job_share_whatsapp", { jobId: job.id, title: job.title, niche })
    setOpen(false)
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      trackEvent("job_share_copy_link", { jobId: job.id, title: job.title, niche })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea")
      textarea.value = shareUrl
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      trackEvent("job_share_copy_link", { jobId: job.id, title: job.title, niche })
      setTimeout(() => setCopied(false), 2000)
    }
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="px-3 py-2 bg-white/5 border border-white/10 text-gray-400 text-sm rounded-lg hover:bg-white/10 transition-all inline-flex items-center gap-1.5"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        Share
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-2 z-50 w-48 bg-[#1a1a1a] border border-white/[0.1] shadow-xl rounded-lg overflow-hidden">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleWhatsApp}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
          >
            <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Share to WhatsApp
          </a>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors w-full text-left"
          >
            <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {copied ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              )}
            </svg>
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      )}
    </div>
  )
}
