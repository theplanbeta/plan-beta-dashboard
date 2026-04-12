import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Not found",
  description: "The page you were looking for could not be found.",
}

/**
 * Root 404.
 *
 * This is served on every domain the app answers to — theplanbeta.com,
 * dayzero.xyz, and local dev. It must stay brand-neutral because we
 * don't know at render time which host the user arrived on (Next.js
 * server components can't read headers() inside a root not-found
 * without tripping dynamic-rendering constraints in edge cases).
 */
export default function RootNotFound() {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            "'Newsreader', 'Georgia', serif",
          background: "#FBF6E7",
          color: "#141109",
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#6B5134",
            marginBottom: 16,
          }}
        >
          № 404 · Akte nicht gefunden
        </div>

        <h1
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: "clamp(2.4rem, 8vw, 4.2rem)",
            margin: 0,
            fontWeight: 500,
          }}
        >
          Nothing in this folder.
        </h1>

        <p
          style={{
            maxWidth: 420,
            marginTop: 16,
            fontSize: 17,
            lineHeight: 1.5,
            color: "#3A2B1C",
          }}
        >
          The page you're looking for may have been archived, renamed, or
          simply never filed. Head back to the main desk.
        </p>

        <Link
          href="/"
          style={{
            marginTop: 28,
            display: "inline-block",
            padding: "12px 22px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#FFF8E7",
            background:
              "linear-gradient(180deg, #E34A2E 0%, #D93A1F 55%, #A82410 100%)",
            border: "1px solid #7A1609",
            borderRadius: 4,
            textDecoration: "none",
            boxShadow:
              "0 1px 0 rgba(255, 220, 215, 0.5) inset, 0 -2px 3px rgba(40, 8, 2, 0.35) inset, 0 3px 0 rgba(80, 20, 15, 0.75), 0 5px 12px rgba(60, 10, 5, 0.32)",
          }}
        >
          Return home →
        </Link>
      </body>
    </html>
  )
}
