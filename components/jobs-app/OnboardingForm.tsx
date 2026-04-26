"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useJobsAuth } from "./AuthProvider"

const GERMAN_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]
const PROFESSIONS = [
  "Nursing",
  "Engineering",
  "IT",
  "Healthcare",
  "Hospitality",
  "Accounting",
  "Teaching",
  "Other",
]

export default function OnboardingForm() {
  const { seeker, refresh } = useJobsAuth()
  const router = useRouter()

  const [germanLevel, setGermanLevel] = useState("")
  const [profession, setProfession] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const firstName = seeker?.name?.split(" ")[0] ?? null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!germanLevel || !profession) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/jobs-app/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ germanLevel, profession }),
      })
      if (res.status === 401) {
        router.replace("/jobs-app/auth?mode=login")
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(
          (data && typeof data.error === "string" && data.error) ||
            "Could not save your profile. Try again."
        )
        return
      }
      await refresh()
      router.replace("/jobs-app/jobs")
    } catch {
      setError("Network error. Check your connection.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      {/* Masthead */}
      <div className="amtlich-enter">
        <span className="amtlich-label">
          <span className="amtlich-rivet" /> Intake form · № 001
        </span>
        <h1 className="display mt-3" style={{ fontSize: "1.9rem" }}>
          {firstName ? `Welcome, ${firstName}.` : "Welcome."}
        </h1>
        <p
          className="ink-soft mt-2"
          style={{
            fontFamily: "var(--f-body)",
            fontSize: "0.95rem",
            lineHeight: 1.5,
          }}
        >
          Two quick details and you'll see every job scored against your profile.
        </p>
      </div>

      {/* German Level */}
      <fieldset className="amtlich-card amtlich-enter amtlich-enter-delay-1">
        <legend className="mono" style={{ padding: "0 6px" }}>
          German level
        </legend>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {GERMAN_LEVELS.map((level) => {
            const active = germanLevel === level
            return (
              <button
                key={level}
                type="button"
                onClick={() => setGermanLevel(level)}
                className="display"
                style={{
                  padding: "12px 8px",
                  fontSize: "1.05rem",
                  fontVariationSettings: '"opsz" 36, "SOFT" 20, "wght" 600',
                  color: active ? "#FFF8E7" : "var(--ink)",
                  border: `1px solid ${
                    active ? "#7A1609" : "var(--manila-edge)"
                  }`,
                  borderRadius: "3px",
                  background: active
                    ? "linear-gradient(180deg, #E34A2E 0%, #D93A1F 55%, #A82410 100%)"
                    : "linear-gradient(180deg, #FDF7DC 0%, #EEE2B8 100%)",
                  boxShadow: active
                    ? "0 1px 0 rgba(255, 220, 215, 0.5) inset, 0 -2px 3px rgba(40, 8, 2, 0.35) inset, 0 2px 0 rgba(80, 20, 15, 0.6), 0 3px 8px rgba(60, 10, 5, 0.25)"
                    : "0 1px 0 rgba(255, 250, 230, 0.9) inset, 0 -2px 3px rgba(140, 102, 24, 0.22) inset, 0 2px 0 rgba(140, 102, 24, 0.4), 0 3px 6px rgba(60, 40, 20, 0.15)",
                  transform: active ? "translateY(-1px)" : "translateY(0)",
                  transition: "all 120ms ease-out",
                  cursor: "pointer",
                }}
              >
                {level}
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Profession */}
      <fieldset className="amtlich-card amtlich-enter amtlich-enter-delay-2">
        <legend className="mono" style={{ padding: "0 6px" }}>
          Your field
        </legend>

        {/* Custom field — type any role/profession not in the list */}
        <input
          type="text"
          value={PROFESSIONS.includes(profession) ? "" : profession}
          onChange={(e) => setProfession(e.target.value)}
          placeholder="Type your role or pick one below…"
          aria-label="Custom field or role"
          className="mt-1 mb-3 w-full"
          style={{
            fontFamily: "var(--f-body)",
            fontSize: "0.95rem",
            color: "var(--ink)",
            padding: "10px 12px",
            border: "1px solid var(--manila-edge)",
            borderRadius: "3px",
            background: "linear-gradient(180deg, #FDF7DC 0%, #F5EBC4 100%)",
            outline: "none",
          }}
        />

        <div className="mt-1 grid grid-cols-2 gap-2">
          {PROFESSIONS.map((prof) => {
            const active = profession === prof
            return (
              <button
                key={prof}
                type="button"
                onClick={() => setProfession(prof)}
                style={{
                  padding: "11px 10px",
                  fontFamily: "var(--f-body)",
                  fontSize: "0.9rem",
                  color: active ? "#FFF8E7" : "var(--ink)",
                  border: `1px solid ${
                    active ? "#7A1609" : "var(--manila-edge)"
                  }`,
                  borderRadius: "3px",
                  background: active
                    ? "linear-gradient(180deg, #E34A2E 0%, #D93A1F 55%, #A82410 100%)"
                    : "linear-gradient(180deg, #FDF7DC 0%, #EEE2B8 100%)",
                  boxShadow: active
                    ? "0 1px 0 rgba(255, 220, 215, 0.5) inset, 0 -2px 3px rgba(40, 8, 2, 0.35) inset, 0 2px 0 rgba(80, 20, 15, 0.6), 0 3px 8px rgba(60, 10, 5, 0.25)"
                    : "0 1px 0 rgba(255, 250, 230, 0.9) inset, 0 -2px 3px rgba(140, 102, 24, 0.22) inset, 0 2px 0 rgba(140, 102, 24, 0.4), 0 3px 6px rgba(60, 40, 20, 0.15)",
                  transform: active ? "translateY(-1px)" : "translateY(0)",
                  transition: "all 120ms ease-out",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                {prof}
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Submit */}
      <div className="amtlich-enter amtlich-enter-delay-3">
        {error && (
          <div
            role="alert"
            className="mono mb-3"
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
        <button
          type="submit"
          disabled={!germanLevel || !profession || saving}
          className="amtlich-btn amtlich-btn--primary w-full disabled:cursor-not-allowed disabled:opacity-50"
          style={{ padding: "14px 22px" }}
        >
          {saving ? "Saving…" : "See your matches →"}
        </button>

        <p
          className="mono ink-faded text-center mt-3"
          style={{ fontSize: "var(--fs-mono-xs)" }}
        >
          You can add more details later to refine your matches
        </p>
      </div>
    </form>
  )
}
