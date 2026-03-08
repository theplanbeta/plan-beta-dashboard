"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"

interface PortalAuth {
  isPremium: boolean
  email: string | null
  tier: string | null
  loading: boolean
  login: (token: string) => void
  logout: () => void
}

const PortalAuthContext = createContext<PortalAuth>({
  isPremium: false,
  email: null,
  tier: null,
  loading: true,
  login: () => {},
  logout: () => {},
})

export function usePortalAuth() {
  return useContext(PortalAuthContext)
}

const TOKEN_KEY = "pb-jobs-token"

export function JobPortalAuthProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [tier, setTier] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const verify = useCallback(async (token: string) => {
    try {
      const res = await fetch("/api/subscriptions/verify", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.isPremium) {
        setIsPremium(true)
        setEmail(data.email)
        setTier(data.tier)
      } else {
        localStorage.removeItem(TOKEN_KEY)
        setIsPremium(false)
        setEmail(null)
        setTier(null)
      }
    } catch {
      setIsPremium(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      verify(token)
    } else {
      setLoading(false)
    }
  }, [verify])

  const login = useCallback((token: string) => {
    localStorage.setItem(TOKEN_KEY, token)
    verify(token)
  }, [verify])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setIsPremium(false)
    setEmail(null)
    setTier(null)
  }, [])

  return (
    <PortalAuthContext.Provider value={{ isPremium, email, tier, loading, login, logout }}>
      {children}
    </PortalAuthContext.Provider>
  )
}
