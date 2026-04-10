"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react"

interface JobSeeker {
  id: string
  email: string
  name: string
  tier: string
  subscriptionStatus: string
  onboardingComplete: boolean
  profile: {
    germanLevel: string | null
    profession: string | null
    profileCompleteness: number
  } | null
}

interface AuthContextValue {
  seeker: JobSeeker | null
  loading: boolean
  isPremium: boolean
  login: (token: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string, days = 30) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax; Secure`
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

async function fetchProfile(): Promise<JobSeeker | null> {
  try {
    const res = await fetch("/api/jobs-app/profile", { credentials: "include" })
    if (!res.ok) return null
    const data = await res.json()
    return data.seeker ?? null
  } catch {
    return null
  }
}

export function JobsAuthProvider({ children }: { children: ReactNode }) {
  const [seeker, setSeeker] = useState<JobSeeker | null>(null)
  const [loading, setLoading] = useState(true)

  const isPremium =
    seeker?.tier === "PREMIUM" ||
    // planBetaStudentId present means the account is linked to an enrolled student
    !!(seeker as unknown as { planBetaStudentId?: string })?.planBetaStudentId

  const load = useCallback(async () => {
    setLoading(true)
    const token = getCookie("pb-jobs-app")
    if (!token) {
      setSeeker(null)
      setLoading(false)
      return
    }
    const profile = await fetchProfile()
    setSeeker(profile)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const login = useCallback(
    async (token: string) => {
      setCookie("pb-jobs-app", token)
      await load()
    },
    [load]
  )

  const logout = useCallback(() => {
    deleteCookie("pb-jobs-app")
    setSeeker(null)
  }, [])

  return (
    <AuthContext.Provider value={{ seeker, loading, isPremium, login, logout }}>
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
