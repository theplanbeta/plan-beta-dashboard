import { useEffect, useRef, useState } from "react"

export interface ImportState {
  id: string
  status: "QUEUED" | "PARSING" | "READY" | "FAILED"
  mode: "REVIEW" | "MERGED" | null
  progress: string | null
  parsedData: unknown | null
  mergeDiff: unknown | null
  error: string | null
}

const BACKOFF_MS = [2000, 3000, 5000, 8000, 10000]
const MAX_TOTAL_MS = 3 * 60 * 1000 // give up after 3 minutes client-side
const PER_REQUEST_TIMEOUT_MS = 8000

export function useCVUploadPolling(importId: string | null) {
  const [state, setState] = useState<ImportState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!importId) return
    let cancelled = false
    let attempts = 0
    const start = Date.now()

    async function poll() {
      if (cancelled) return
      if (typeof document !== "undefined" && document.hidden) {
        // Defer while tab is hidden — resume on visibilitychange
        timerRef.current = setTimeout(poll, 1000)
        return
      }
      if (Date.now() - start > MAX_TOTAL_MS) {
        setError("Parse timed out. Please reload and try again.")
        return
      }

      abortRef.current = new AbortController()
      const timeout = setTimeout(() => abortRef.current?.abort(), PER_REQUEST_TIMEOUT_MS)
      try {
        const res = await fetch(`/api/jobs-app/profile/imports/${importId}`, {
          credentials: "include",
          signal: abortRef.current.signal,
        })
        clearTimeout(timeout)
        if (!res.ok) {
          setError(`HTTP ${res.status}`)
          if (res.status === 401 || res.status === 403 || res.status === 404) return
        } else {
          const data = (await res.json()) as ImportState
          if (cancelled) return
          setState(data)
          if (data.status !== "QUEUED" && data.status !== "PARSING") return // terminal
        }
      } catch (e) {
        clearTimeout(timeout)
        if (cancelled) return
        const err = e as Error
        if (err.name !== "AbortError") setError(err.message)
      }

      const delay = BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)]
      attempts += 1
      timerRef.current = setTimeout(poll, delay)
    }

    function onVisibility() {
      if (typeof document !== "undefined" && !document.hidden && !cancelled) {
        if (timerRef.current) clearTimeout(timerRef.current)
        poll()
      }
    }

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility)
    }

    poll()
    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
      abortRef.current?.abort()
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility)
      }
    }
  }, [importId])

  return { state, error }
}
