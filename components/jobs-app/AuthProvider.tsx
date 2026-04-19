"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react"

/** Full profile shape returned by GET /api/jobs-app/profile.
 *  Child pages read from this via context — NEVER refetch the profile. */
export interface JobSeekerProfileShape {
  firstName: string | null
  lastName: string | null
  germanLevel: string | null
  profession: string | null
  currentJobTitle: string | null
  yearsOfExperience: number | null
  workExperience: Array<{
    id: string
    company: string
    title: string
    from: string | null
    to: string | null
    description: string | null
  }> | null
  skills: { technical: string[]; languages: string[]; soft: string[] } | null
  educationDetails: Array<{
    id: string
    institution: string
    degree: string | null
    field: string | null
    year: string | null
  }> | null
  certifications: Array<{
    id: string
    name: string
    issuer: string | null
    year: string | null
  }> | null
  profileCompleteness: number
  manuallyEditedFields: Record<string, true> | null
}

interface JobSeeker {
  id: string
  email: string
  name: string
  tier: string
  subscriptionStatus: string
  currentPeriodEnd: string | null
  billingProvider: string | null
  stripeCustomerId: string | null
  planBetaStudentId: string | null
  onboardingComplete: boolean
  /** Canonical premium flag computed server-side via isPremiumEffective. */
  isPremium: boolean
  /** Server allows null when the user hasn't PUT a profile yet. */
  profile: JobSeekerProfileShape | null
  referralCode: string | null
}

interface AuthContextValue {
  seeker: JobSeeker | null
  loading: boolean
  isPremium: boolean
  /** Re-fetch the profile from the server (reads the httpOnly cookie). */
  refresh: () => Promise<void>
  /** Clear the session by hitting the server logout endpoint. */
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Fetch the current profile. The server reads the httpOnly `pb-jobs-app`
 * cookie to resolve identity — the client never touches it.
 *
 * 200 → logged in (returns seeker)
 * 401 → not logged in (returns null)
 */
async function fetchProfile(): Promise<JobSeeker | null> {
  try {
    const res = await fetch("/api/jobs-app/profile", {
      credentials: "include",
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data?.seeker as JobSeeker) ?? null
  } catch {
    return null
  }
}

export function JobsAuthProvider({ children }: { children: ReactNode }) {
  const [seeker, setSeeker] = useState<JobSeeker | null>(null)
  const [loading, setLoading] = useState(true)

  // The server is the source of truth for premium; we just mirror it.
  const isPremium = Boolean(seeker?.isPremium)

  const refresh = useCallback(async () => {
    setLoading(true)
    const profile = await fetchProfile()
    setSeeker(profile)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const logout = useCallback(async () => {
    try {
      await fetch("/api/jobs-app/auth/logout", {
        method: "POST",
        credentials: "include",
      })
    } catch {
      // Even if the network call fails, clear local state so the UI
      // reflects a logged-out session. The stale cookie will expire.
    }
    setSeeker(null)
  }, [])

  return (
    <AuthContext.Provider value={{ seeker, loading, isPremium, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useJobsAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useJobsAuth must be used within JobsAuthProvider")
  }
  return ctx
}
