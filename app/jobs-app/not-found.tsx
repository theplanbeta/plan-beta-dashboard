import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Not found · Day Zero",
}

export default function JobsAppNotFound() {
  return (
    <div className="space-y-6">
      <header className="amtlich-enter">
        <span className="amtlich-label">
          <span className="amtlich-rivet" /> № 404 · Akte nicht gefunden
        </span>
        <h1 className="display mt-3" style={{ fontSize: "2rem" }}>
          Nothing in this folder.
        </h1>
        <p
          className="ink-soft mt-2"
          style={{
            fontFamily: "var(--f-body)",
            fontSize: "0.95rem",
            lineHeight: 1.5,
          }}
        >
          The page you're looking for may have been archived, renamed, or
          simply never filed.
        </p>
      </header>

      <section className="amtlich-card amtlich-enter amtlich-enter-delay-1">
        <div className="flex items-center justify-between">
          <span className="mono">Next steps</span>
          <span className="amtlich-stamp amtlich-stamp--ink">Entwurf</span>
        </div>
        <div className="mt-4 space-y-3">
          <Link
            href="/jobs-app/jobs"
            className="amtlich-btn amtlich-btn--primary block text-center no-underline"
            style={{ padding: "13px 22px" }}
          >
            Browse jobs →
          </Link>
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
