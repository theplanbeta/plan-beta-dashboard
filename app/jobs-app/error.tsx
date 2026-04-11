"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function JobsAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface in Vercel logs; skip noisy dev HMR reconnects.
    console.error("[jobs-app error boundary]", error)
  }, [error])

  return (
    <div className="space-y-6">
      <header className="amtlich-enter">
        <span className="amtlich-label">
          <span className="amtlich-rivet" /> № 500 · Etwas ist schiefgelaufen
        </span>
        <h1 className="display mt-3" style={{ fontSize: "2rem" }}>
          Paperwork jam.
        </h1>
        <p
          className="ink-soft mt-2"
          style={{
            fontFamily: "var(--f-body)",
            fontSize: "0.95rem",
            lineHeight: 1.5,
          }}
        >
          Something went wrong loading this page. The error has been logged.
        </p>
      </header>

      {error?.digest && (
        <div
          className="amtlich-card amtlich-enter amtlich-enter-delay-1"
          style={{ fontFamily: "var(--f-mono)", fontSize: "var(--fs-mono-xs)" }}
        >
          <span className="ink-faded">Reference code: </span>
          <span className="ink">{error.digest}</span>
        </div>
      )}

      <section className="amtlich-card amtlich-enter amtlich-enter-delay-2">
        <div className="flex items-center justify-between">
          <span className="mono">Next steps</span>
          <span className="amtlich-stamp amtlich-stamp--ink">Fehler</span>
        </div>
        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={() => reset()}
            className="amtlich-btn amtlich-btn--primary block w-full text-center"
            style={{ padding: "13px 22px" }}
          >
            Try again →
          </button>
          <Link
            href="/jobs-app"
            className="amtlich-btn block text-center no-underline"
            style={{ padding: "13px 22px" }}
          >
            Back to home
          </Link>
        </div>
      </section>
    </div>
  )
}
