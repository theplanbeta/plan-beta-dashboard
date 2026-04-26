"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useJobsAuth } from "./AuthProvider"
import { consumeStoredReferralCode } from "./ReferralCapture"

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: "Google sign-in isn't configured yet. Use email instead.",
  state_mismatch: "Google sign-in expired. Please try again.",
  token_exchange_failed: "Couldn't complete Google sign-in. Try again.",
  no_access_token: "Google didn't return an access token. Try again.",
  userinfo_failed: "Couldn't read your Google profile. Try again.",
  email_unverified: "Verify your Google email first, then try again.",
  missing_code: "Google sign-in was cancelled.",
  access_denied: "Google sign-in was cancelled.",
}

type Mode = "login" | "register"

export default function AuthForm({ initialMode = "register" }: { initialMode?: Mode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refresh } = useJobsAuth()

  const [mode, setMode] = useState<Mode>(initialMode)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isRegister = mode === "register"

  // Surface errors returned by the Google OAuth callback redirect
  useEffect(() => {
    const errCode = searchParams.get("error")
    if (errCode) {
      setError(GOOGLE_ERROR_MESSAGES[errCode] ?? "Sign-in failed. Please try again.")
    }
  }, [searchParams])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError("Enter an email and password.")
      return
    }
    if (isRegister && !name.trim()) {
      setError("Enter your name.")
      return
    }
    if (isRegister && password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setSubmitting(true)
    try {
      const endpoint = isRegister
        ? "/api/jobs-app/auth/register"
        : "/api/jobs-app/auth/login"
      const storedReferral = isRegister ? consumeStoredReferralCode() : null
      const body = isRegister
        ? {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            ...(storedReferral ? { referralCode: storedReferral } : {}),
          }
        : { email: email.trim().toLowerCase(), password }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(
          (data && typeof data.error === "string" && data.error) ||
            (res.status === 429
              ? "Too many attempts. Try again in a minute."
              : "Something went wrong. Try again.")
        )
        return
      }

      const data = await res.json().catch(() => ({}))
      await refresh()

      if (isRegister) {
        router.replace("/jobs-app/onboarding")
      } else if (data?.seeker?.onboardingComplete) {
        router.replace("/jobs-app/jobs")
      } else {
        router.replace("/jobs-app/onboarding")
      }
    } catch {
      setError("Network error. Check your connection.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full space-y-6">
      {/* Masthead */}
      <div className="amtlich-enter">
        <span className="amtlich-label">
          <span className="amtlich-rivet" />
          {isRegister ? "Intake · № 00" : "Returning · № 00"}
        </span>
        <h1 className="display mt-3" style={{ fontSize: "1.9rem" }}>
          {isRegister ? "Open your dossier." : "Welcome back."}
        </h1>
        <p
          className="ink-soft mt-2"
          style={{
            fontFamily: "var(--f-body)",
            fontSize: "0.95rem",
            lineHeight: 1.5,
          }}
        >
          {isRegister
            ? "Create your career folder. Every job you match, every CV you generate, every application you send — all in one place."
            : "Sign in to pick up where you left off."}
        </p>
      </div>

      {/* Continue with Google */}
      <div className="amtlich-enter amtlich-enter-delay-1">
        <a
          href={`/api/jobs-app/auth/google/start?next=${encodeURIComponent("/jobs-app/jobs")}`}
          className="amtlich-btn w-full inline-flex items-center justify-center gap-2 no-underline"
          style={{ padding: "12px 22px" }}
          aria-label={isRegister ? "Sign up with Google" : "Sign in with Google"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </a>
        <div
          className="mono ink-faded text-center mt-3"
          style={{ fontSize: "var(--fs-mono-xs)", letterSpacing: "0.08em" }}
        >
          — or with email —
        </div>
      </div>

      {/* Mode toggle */}
      <div
        className="amtlich-enter amtlich-enter-delay-1 grid grid-cols-2 gap-2"
        role="tablist"
        aria-label="Authentication mode"
      >
        {(["register", "login"] as const).map((m) => {
          const active = mode === m
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setMode(m)
                setError(null)
              }}
              className="display"
              style={{
                padding: "10px 8px",
                fontSize: "0.9rem",
                fontVariationSettings: '"opsz" 36, "SOFT" 20, "wght" 600',
                color: active ? "#FFF8E7" : "var(--ink)",
                border: `1px solid ${active ? "#7A1609" : "var(--manila-edge)"}`,
                borderRadius: "3px",
                background: active
                  ? "linear-gradient(180deg, #E34A2E 0%, #D93A1F 55%, #A82410 100%)"
                  : "linear-gradient(180deg, #FDF7DC 0%, #EEE2B8 100%)",
                boxShadow: active
                  ? "0 1px 0 rgba(255, 220, 215, 0.5) inset, 0 -2px 3px rgba(40, 8, 2, 0.35) inset, 0 2px 0 rgba(80, 20, 15, 0.6), 0 3px 8px rgba(60, 10, 5, 0.25)"
                  : "0 1px 0 rgba(255, 250, 230, 0.9) inset, 0 -2px 3px rgba(140, 102, 24, 0.22) inset, 0 2px 0 rgba(140, 102, 24, 0.4), 0 3px 6px rgba(60, 40, 20, 0.15)",
                transition: "all 120ms ease-out",
                cursor: "pointer",
              }}
            >
              {m === "register" ? "Sign up" : "Sign in"}
            </button>
          )
        })}
      </div>

      {/* Fields */}
      <fieldset className="amtlich-card amtlich-enter amtlich-enter-delay-2 space-y-4">
        <legend className="mono" style={{ padding: "0 6px" }}>
          {isRegister ? "Your details" : "Credentials"}
        </legend>

        {isRegister && (
          <label className="block">
            <span
              className="mono ink-soft block"
              style={{ fontSize: "var(--fs-mono-xs)", marginBottom: "4px" }}
            >
              Full name
            </span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pb-auth-input"
              placeholder="Priya Sharma"
              required
            />
          </label>
        )}

        <label className="block">
          <span
            className="mono ink-soft block"
            style={{ fontSize: "var(--fs-mono-xs)", marginBottom: "4px" }}
          >
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pb-auth-input"
            placeholder="you@example.com"
            required
          />
        </label>

        <label className="block">
          <span
            className="mono ink-soft block"
            style={{ fontSize: "var(--fs-mono-xs)", marginBottom: "4px" }}
          >
            Password
          </span>
          <input
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pb-auth-input"
            placeholder={isRegister ? "8+ characters" : "••••••••"}
            required
            minLength={isRegister ? 8 : 1}
          />
        </label>

        {error && (
          <div
            role="alert"
            className="mono"
            style={{
              fontSize: "var(--fs-mono-xs)",
              color: "var(--stamp-red)",
              padding: "8px 10px",
              border: "1px dashed var(--stamp-red)",
              borderRadius: "3px",
              background: "rgba(217, 58, 31, 0.06)",
            }}
          >
            {error}
          </div>
        )}
      </fieldset>

      {/* Submit */}
      <div className="amtlich-enter amtlich-enter-delay-3">
        <button
          type="submit"
          disabled={submitting}
          className="amtlich-btn amtlich-btn--primary w-full disabled:cursor-not-allowed disabled:opacity-60"
          style={{ padding: "14px 22px" }}
        >
          {submitting
            ? isRegister
              ? "Opening dossier…"
              : "Signing in…"
            : isRegister
            ? "Create my folder →"
            : "Sign in →"}
        </button>

        <p
          className="mono ink-faded text-center mt-3"
          style={{ fontSize: "var(--fs-mono-xs)" }}
        >
          {isRegister
            ? "By continuing you agree to the terms and privacy notice."
            : "Your session stays active for 30 days."}
        </p>
      </div>
    </form>
  )
}
