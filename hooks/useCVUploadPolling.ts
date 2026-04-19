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

export function useCVUploadPolling(importId: string | null) {
  const [state, setState] = useState<ImportState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!importId) return
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch(`/api/jobs-app/profile/imports/${importId}`, { credentials: "include" })
        if (!res.ok) {
          setError(`HTTP ${res.status}`)
          return
        }
        const data = (await res.json()) as ImportState
        if (cancelled) return
        setState(data)
        if (data.status === "QUEUED" || data.status === "PARSING") {
          timerRef.current = setTimeout(poll, 2000)
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      }
    }

    poll()
    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [importId])

  return { state, error }
}
