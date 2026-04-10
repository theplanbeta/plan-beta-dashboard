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
  const { seeker } = useJobsAuth()
  const router = useRouter()

  const [germanLevel, setGermanLevel] = useState("")
  const [profession, setProfession] = useState("")
  const [saving, setSaving] = useState(false)

  const firstName = seeker?.name?.split(" ")[0] ?? null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!germanLevel || !profession) return
    setSaving(true)
    try {
      const res = await fetch("/api/jobs-app/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ germanLevel, profession }),
      })
      if (res.ok) {
        router.push("/jobs-app/jobs")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      {/* Heading */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {firstName ? `Welcome, ${firstName}!` : "Welcome!"}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Two quick questions and you'll see your job matches.
        </p>
      </div>

      {/* German Level */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">
          Your German level
        </p>
        <div className="grid grid-cols-3 gap-2">
          {GERMAN_LEVELS.map((level) => {
            const active = germanLevel === level
            return (
              <button
                key={level}
                type="button"
                onClick={() => setGermanLevel(level)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                {level}
              </button>
            )
          })}
        </div>
      </div>

      {/* Profession */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">
          Your profession
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PROFESSIONS.map((prof) => {
            const active = profession === prof
            return (
              <button
                key={prof}
                type="button"
                onClick={() => setProfession(prof)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                {prof}
              </button>
            )
          })}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!germanLevel || !profession || saving}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving…" : "See Your Job Matches →"}
      </button>

      {/* Footer hint */}
      <p className="text-center text-xs text-gray-400">
        You can add more details later to improve your match accuracy
      </p>
    </form>
  )
}
