"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

const CONSENT_KEY = "pb-cookie-consent"

type ConsentState = {
  essential: boolean
  analytics: boolean
  timestamp: number
}

export function getConsent(): ConsentState | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem(CONSENT_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function saveConsent(analytics: boolean) {
  const consent: ConsentState = {
    essential: true,
    analytics,
    timestamp: Date.now(),
  }
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent))
  window.dispatchEvent(
    new CustomEvent("consent-updated", { detail: consent })
  )
  return consent
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Small delay so it doesn't flash on page load
    const timer = setTimeout(() => {
      const consent = getConsent()
      if (!consent) setShowBanner(true)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  const handleAcceptAll = () => {
    saveConsent(true)
    setShowBanner(false)
  }

  const handleEssentialOnly = () => {
    saveConsent(false)
    setShowBanner(false)
  }

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="fixed bottom-0 left-0 right-0 z-[60] p-4"
        >
          <div className="max-w-4xl mx-auto bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium mb-1">
                  We value your privacy
                </p>
                <p className="text-gray-400 text-sm leading-relaxed">
                  We use essential cookies for site functionality. Analytics
                  cookies help us improve your experience.{" "}
                  <Link
                    href="/privacy"
                    className="text-primary hover:underline"
                  >
                    Privacy Policy
                  </Link>
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <button
                  onClick={handleEssentialOnly}
                  className="px-5 py-2.5 text-sm font-medium text-gray-300 border border-white/20 rounded-full hover:bg-white/10 transition-colors"
                >
                  Essential Only
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-full hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
