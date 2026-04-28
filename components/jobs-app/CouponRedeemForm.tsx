"use client"

import { useState } from "react"
import { Ticket, Loader2 } from "lucide-react"
import { toast } from "sonner"

/**
 * CouponRedeemForm — small input + button. Posts to /coupons/redeem and
 * invokes onRedeemed() on success so the parent can refresh subscription
 * state. Self-contained styling matches the amtlich (manila-folder)
 * design system.
 */

export interface CouponRedeemFormProps {
  onRedeemed?: () => void | Promise<void>
}

export function CouponRedeemForm({ onRedeemed }: CouponRedeemFormProps) {
  const [code, setCode] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/jobs-app/coupons/redeem", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data: { error?: string; tier?: string; expiresAt?: string | null } =
        await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Couldn't redeem code.")
        return
      }
      const expiry = data.expiresAt
        ? new Date(data.expiresAt).toLocaleDateString()
        : "indefinitely"
      toast.success(`Pro unlocked — active until ${expiry}.`)
      setCode("")
      if (onRedeemed) await onRedeemed()
    } catch {
      toast.error("Network error. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="amtlich-card amtlich-enter"
      style={{ padding: "16px 18px" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Ticket size={14} strokeWidth={1.8} style={{ color: "var(--ink-soft)" }} />
        <span className="mono" style={{ fontSize: "var(--fs-mono-xs)" }}>
          Have a code?
        </span>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="DAYZERO-XXXX"
          aria-label="Coupon code"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={64}
          className="flex-1"
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: "var(--fs-mono-sm)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--ink)",
            background: "linear-gradient(180deg, #FDF7DC 0%, #F5EBC4 100%)",
            border: "1px solid var(--manila-edge)",
            borderRadius: "3px",
            padding: "8px 12px",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={!code.trim() || submitting}
          className="amtlich-btn"
          style={{ padding: "8px 14px", fontSize: "var(--fs-mono-xs)" }}
        >
          {submitting ? (
            <Loader2 size={12} strokeWidth={2} className="animate-spin" />
          ) : (
            "Redeem"
          )}
        </button>
      </div>
    </form>
  )
}
