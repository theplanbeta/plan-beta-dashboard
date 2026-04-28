"use client"

import { toast } from "sonner"
import { useCallback, useEffect, useState } from "react"
import {
  Loader2,
  LogOut,
  GraduationCap,
  ExternalLink,
  Check,
} from "lucide-react"
import { useJobsAuth } from "@/components/jobs-app/AuthProvider"
import { ShareButton } from "@/components/jobs-app/ShareButton"
import { CouponRedeemForm } from "@/components/jobs-app/CouponRedeemForm"
import { appendUtm } from "@/lib/share-links"
import Link from "next/link"

interface SubscriptionStatus {
  effective: "free" | "pro" | "student" | "grandfathered"
  tier: string
  status: string
  currentPeriodEnd: string | null
  billingProvider: string | null
  legacy: { priceId: string | null; currentPeriodEnd: string | null } | null
  studentLinked: boolean
}

export default function SettingsPage() {
  const { seeker, loading: authLoading, logout } = useJobsAuth()
  const [sub, setSub] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const [checkoutLoading, setCheckoutLoading] = useState<"monthly" | "annual" | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const [studentEmail, setStudentEmail] = useState("")
  const [linkingStudent, setLinkingStudent] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [justLinked, setJustLinked] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs-app/subscribe/status", {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setSub(data.subscription)
        return data.subscription as SubscriptionStatus
      }
    } catch {
      // Network error — leave current state, don't crash
    } finally {
      setLoading(false)
    }
    return null
  }, [])

  useEffect(() => {
    if (!authLoading && seeker) fetchStatus()
    else if (!authLoading && !seeker) setLoading(false)
  }, [authLoading, seeker, fetchStatus])

  // Poll for subscription upgrade after Stripe checkout redirect.
  // The webhook may take a few seconds to process, so the first
  // fetchStatus might still show "free". Poll every 2s for up to 30s.
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("upgraded") !== "true") return

    let attempts = 0
    const maxAttempts = 15
    const interval = setInterval(async () => {
      attempts++
      const result = await fetchStatus()
      if (result && result.effective !== "free") {
        clearInterval(interval)
        // Clean up the URL
        window.history.replaceState({}, "", "/jobs-app/settings")
      }
      if (attempts >= maxAttempts) clearInterval(interval)
    }, 2000)

    return () => clearInterval(interval)
  }, [fetchStatus])

  async function handleCheckout(plan: "monthly" | "annual") {
    setCheckoutLoading(plan)
    try {
      const res = await fetch("/api/jobs-app/subscribe/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || "Failed to start checkout")
      }
    } finally {
      setCheckoutLoading(null)
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true)
    try {
      const res = await fetch("/api/jobs-app/subscribe/portal", {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) window.location.href = data.url
      else toast.error(data.error || "Failed to open billing portal")
    } catch {
      toast.error("Network error. Check your connection.")
    } finally {
      setPortalLoading(false)
    }
  }

  async function handleLinkStudent(e: React.FormEvent) {
    e.preventDefault()
    setLinkError(null)
    setLinkingStudent(true)
    try {
      const res = await fetch("/api/jobs-app/student/link", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentEmail }),
      })
      const data = await res.json()
      if (res.ok) {
        setJustLinked(true)
        await fetchStatus()
        setTimeout(() => setJustLinked(false), 4000)
      } else {
        setLinkError(data.error || "Failed to link student account")
      }
    } finally {
      setLinkingStudent(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2
          className="h-7 w-7 animate-spin"
          style={{ color: "var(--brass)" }}
        />
      </div>
    )
  }

  if (!seeker) {
    return (
      <div className="space-y-5">
        <header className="amtlich-enter">
          <h1 className="display" style={{ fontSize: "1.95rem" }}>
            Account
          </h1>
        </header>
        <div className="amtlich-card text-center" style={{ padding: "32px 24px" }}>
          <p className="ink-soft" style={{ fontFamily: "var(--f-body)" }}>
            Please sign in to manage your account.
          </p>
          <Link
            href="/jobs-app/onboarding"
            className="amtlich-btn amtlich-btn--primary mt-4 inline-block no-underline"
          >
            Sign up
          </Link>
        </div>
      </div>
    )
  }

  const effective = sub?.effective ?? "free"
  const stampVariant =
    effective === "pro" || effective === "grandfathered"
      ? "amtlich-stamp--green"
      : effective === "student"
      ? "amtlich-stamp--teal"
      : "amtlich-stamp--ink"

  const effectiveLabel =
    effective === "pro"
      ? "Pro · Active"
      : effective === "grandfathered"
      ? "Pro · Grandfathered"
      : effective === "student"
      ? "Student · Bundled"
      : "Free"

  const periodEnd =
    sub?.currentPeriodEnd || sub?.legacy?.currentPeriodEnd || null

  return (
    <div className="space-y-6">
      {/* ── Masthead ────────────────────────────────────────── */}
      <header className="amtlich-enter">
        <span className="amtlich-label">
          <span className="amtlich-rivet" /> Account &amp; billing
        </span>
        <h1 className="display mt-3" style={{ fontSize: "1.95rem" }}>
          Your account
        </h1>
        <hr className="amtlich-divider mt-3" />
      </header>

      {/* ── Subscription card ──────────────────────────────── */}
      <section className="amtlich-card amtlich-enter amtlich-enter-delay-1">
        <div className="flex items-center justify-between">
          <span className="mono">Subscription</span>
          <span
            className={`amtlich-stamp ${stampVariant}`}
            style={{ transform: "rotate(-2deg)" }}
          >
            {effectiveLabel}
          </span>
        </div>

        <hr className="amtlich-divider" style={{ margin: "14px 0 10px" }} />

        {effective === "free" && (
          <>
            <p
              className="ink-soft"
              style={{
                fontFamily: "var(--f-body)",
                fontSize: "0.92rem",
                lineHeight: 1.5,
              }}
            >
              Upgrade to <strong>Pro</strong> to unlock AI-tailored CVs,
              cover letters, deep match scoring, and interview prep.
              Cancel anytime.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleCheckout("monthly")}
                disabled={!!checkoutLoading}
                className="amtlich-btn disabled:opacity-60"
                style={{ padding: "14px 12px" }}
              >
                {checkoutLoading === "monthly" ? (
                  <Loader2
                    size={14}
                    className="inline-block animate-spin"
                  />
                ) : (
                  <>
                    <div
                      className="display"
                      style={{
                        fontSize: "1.35rem",
                        fontVariationSettings:
                          '"opsz" 36, "SOFT" 20, "wght" 600',
                      }}
                    >
                      €4.99
                    </div>
                    <div
                      className="mono ink-faded mt-1"
                      style={{ fontSize: "var(--fs-mono-xs)" }}
                    >
                      per month
                    </div>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleCheckout("annual")}
                disabled={!!checkoutLoading}
                className="amtlich-btn amtlich-btn--primary disabled:opacity-60 relative"
                style={{ padding: "14px 12px" }}
              >
                {checkoutLoading === "annual" ? (
                  <Loader2
                    size={14}
                    className="inline-block animate-spin"
                  />
                ) : (
                  <>
                    <span
                      className="amtlich-stamp amtlich-stamp--green"
                      style={{
                        position: "absolute",
                        top: "-10px",
                        right: "6px",
                        fontSize: "0.55rem",
                        padding: "2px 6px",
                        transform: "rotate(5deg)",
                      }}
                    >
                      2 months free
                    </span>
                    <div
                      className="display"
                      style={{
                        fontSize: "1.35rem",
                        fontVariationSettings:
                          '"opsz" 36, "SOFT" 20, "wght" 600',
                      }}
                    >
                      €49.99
                    </div>
                    <div
                      className="mono mt-1"
                      style={{
                        fontSize: "var(--fs-mono-xs)",
                        color: "rgba(255, 248, 231, 0.75)",
                      }}
                    >
                      per year
                    </div>
                  </>
                )}
              </button>
            </div>

            <p
              className="mono ink-faded text-center mt-4"
              style={{ fontSize: "var(--fs-mono-xs)" }}
            >
              7-day free trial · Cancel anytime
            </p>
          </>
        )}

        {(effective === "pro" || effective === "grandfathered") && (
          <>
            {periodEnd && (
              <p
                className="ink-soft"
                style={{ fontFamily: "var(--f-body)", fontSize: "0.92rem" }}
              >
                Your subscription renews on{" "}
                <strong>
                  {new Date(periodEnd).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
                .
              </p>
            )}

            {effective === "grandfathered" && (
              <p
                className="ink-faded mt-2"
                style={{
                  fontFamily: "var(--f-body)",
                  fontSize: "0.82rem",
                  fontStyle: "italic",
                }}
              >
                You're on the early-adopter rate. Your legacy subscription
                unlocks all Pro features — thanks for being here early.
              </p>
            )}

            <button
              type="button"
              onClick={handleManageBilling}
              disabled={portalLoading || !seeker.stripeCustomerId}
              className="amtlich-btn mt-4 w-full disabled:opacity-60"
            >
              {portalLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin" />
                  Opening billing portal
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <ExternalLink size={13} strokeWidth={2.2} />
                  Manage subscription
                </span>
              )}
            </button>

            {!seeker.stripeCustomerId && effective === "grandfathered" && (
              <p
                className="mono ink-faded mt-2 text-center"
                style={{ fontSize: "var(--fs-mono-xs)" }}
              >
                Billing managed via the original signup.
              </p>
            )}
          </>
        )}

        {effective === "student" && (
          <p
            className="ink-soft"
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.92rem",
              lineHeight: 1.5,
            }}
          >
            Pro features are <strong>bundled free</strong> with your Plan Beta
            course enrollment. Enjoy.
          </p>
        )}
      </section>

      {/* ── Student link card ─────────────────────────────── */}
      {effective !== "student" && (
        <section className="amtlich-card amtlich-enter amtlich-enter-delay-2">
          <div className="flex items-center justify-between">
            <span className="mono inline-flex items-center gap-2">
              <GraduationCap size={12} strokeWidth={2} /> Plan Beta student?
            </span>
            {justLinked && (
              <span
                className="amtlich-stamp amtlich-stamp--green"
                style={{ transform: "rotate(3deg)" }}
              >
                Verified
              </span>
            )}
          </div>

          <hr className="amtlich-divider" style={{ margin: "14px 0 10px" }} />

          <p
            className="ink-soft"
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.88rem",
              lineHeight: 1.5,
            }}
          >
            Currently enrolled in a Plan Beta German course? Link your
            student record to unlock Pro features free.
          </p>

          <form onSubmit={handleLinkStudent} className="mt-4 flex gap-2">
            <input
              type="email"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="Your Plan Beta email"
              required
              style={{
                flex: 1,
                fontFamily: "var(--f-body)",
                fontSize: "0.9rem",
                color: "var(--ink)",
                background: "rgba(255, 253, 240, 0.7)",
                border: "1px solid var(--manila-edge)",
                borderRadius: "3px",
                padding: "10px 12px",
                boxShadow: "0 1px 2px rgba(60, 40, 20, 0.12) inset",
              }}
            />
            <button
              type="submit"
              disabled={linkingStudent || !studentEmail}
              className="amtlich-btn disabled:opacity-60"
              style={{ padding: "10px 16px", fontSize: "var(--fs-mono-xs)" }}
            >
              {linkingStudent ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                "Verify"
              )}
            </button>
          </form>

          {linkError && (
            <p
              className="ink-red mt-2"
              style={{
                fontFamily: "var(--f-mono)",
                fontSize: "var(--fs-mono-xs)",
              }}
            >
              {linkError}
            </p>
          )}
        </section>
      )}

      {/* ── Coupon redemption ─────────────────────────────── */}
      <CouponRedeemForm onRedeemed={async () => { await fetchStatus() }} />

      {/* ── Account card ──────────────────────────────────── */}
      <section className="amtlich-card amtlich-enter amtlich-enter-delay-3">
        <span className="mono">Account</span>

        <hr className="amtlich-divider" style={{ margin: "14px 0 10px" }} />

        <dl className="space-y-2" style={{ fontFamily: "var(--f-body)" }}>
          <div className="flex items-center justify-between">
            <dt
              className="mono ink-faded"
              style={{ fontSize: "var(--fs-mono-xs)" }}
            >
              Name
            </dt>
            <dd className="ink" style={{ fontSize: "0.9rem" }}>
              {seeker.name || "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt
              className="mono ink-faded"
              style={{ fontSize: "var(--fs-mono-xs)" }}
            >
              Email
            </dt>
            <dd className="ink" style={{ fontSize: "0.9rem" }}>
              {seeker.email}
            </dd>
          </div>
        </dl>

        <hr className="amtlich-divider" style={{ margin: "16px 0 12px" }} />

        {/* Referral card — amtlich-styled, wa.me + copy */}
        {seeker && "referralCode" in seeker && (seeker as { referralCode: string | null }).referralCode && (
          <div className="mb-3 p-3 border rounded">
            <div className="mono text-xs opacity-60 mb-2">Refer a friend</div>
            <p className="text-sm mb-2">
              Invite someone heading to Germany. Your code:
            </p>
            <div className="flex items-center gap-2 mb-2">
              <code className="font-mono bg-gray-100 px-3 py-2 rounded select-all text-sm">
                {(seeker as { referralCode: string }).referralCode}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard
                    .writeText((seeker as { referralCode: string }).referralCode)
                    .catch(() => {})
                }}
                className="amtlich-btn text-xs"
                style={{ padding: "6px 12px" }}
              >
                Copy
              </button>
            </div>
            <ShareButton
              text="I'm using Day Zero to find a job in Germany — it reads your CV and matches you to live openings. Try it with my code:"
              url={appendUtm("https://dayzero.xyz", {
                source: "whatsapp",
                medium: "referral",
                campaign: "invite",
                code: (seeker as { referralCode: string }).referralCode,
              })}
              label="Share with a friend"
              className="amtlich-btn w-full inline-flex items-center justify-center gap-2"
            />
          </div>
        )}

        <Link
          href="/jobs-app/profile"
          className="amtlich-btn w-full mb-2 no-underline inline-block text-center"
        >
          Edit your profile →
        </Link>

        <button
          type="button"
          onClick={async () => {
            await logout()
            window.location.href = "/jobs-app"
          }}
          className="amtlich-btn w-full"
        >
          <span className="inline-flex items-center gap-2">
            <LogOut size={13} strokeWidth={2.2} />
            Sign out
          </span>
        </button>
      </section>
    </div>
  )
}
