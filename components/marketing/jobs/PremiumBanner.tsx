"use client"

import { useState, useEffect } from "react"
import { usePortalAuth } from "./JobPortalAuthProvider"
import { SubscriptionModal } from "./SubscriptionModal"

const DISMISSED_KEY = "pb-premium-banner-dismissed"

export function PremiumBanner() {
  const { isPremium, loading } = usePortalAuth()
  const [visible, setVisible] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (loading || isPremium) return
    if (localStorage.getItem(DISMISSED_KEY)) return

    const handleScroll = () => {
      if (window.scrollY > 800) {
        setVisible(true)
        window.removeEventListener("scroll", handleScroll)
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [loading, isPremium])

  if (!visible || isPremium) return null

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden">
        <div className="bg-[#1a1a1a] border-t border-white/[0.1] px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">Get instant job alerts</p>
            <p className="text-xs text-gray-400">EUR 1.99/mo — cancel anytime</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-all flex-shrink-0"
          >
            Upgrade
          </button>
          <button
            onClick={() => {
              setVisible(false)
              localStorage.setItem(DISMISSED_KEY, "1")
            }}
            className="text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      {showModal && <SubscriptionModal onClose={() => setShowModal(false)} />}
    </>
  )
}
