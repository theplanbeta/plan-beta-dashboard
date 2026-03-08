"use client"

import { useState, type ReactNode } from "react"
import { SubscriptionModal } from "./SubscriptionModal"

interface PremiumGateProps {
  feature: string
  children: ReactNode
}

export function PremiumGate({ feature, children }: PremiumGateProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div onClick={() => setShowModal(true)} className="cursor-pointer">
        {children}
      </div>
      {showModal && (
        <SubscriptionModal
          onClose={() => setShowModal(false)}
          triggerFeature={feature}
        />
      )}
    </>
  )
}
