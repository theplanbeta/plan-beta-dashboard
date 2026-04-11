import type { Metadata, Viewport } from "next"
import { JobsAuthProvider } from "@/components/jobs-app/AuthProvider"
import { BottomNav } from "@/components/jobs-app/BottomNav"
import "./amtlich.css"

export const metadata: Metadata = {
  title: "PlanBeta Jobs — Die Bewerbungsmappe",
  description:
    "AI-powered job matching, CV generation, and interview prep for the German job market — tailored for Indian professionals.",
  manifest: "/jobs-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PB Jobs",
  },
}

export const viewport: Viewport = {
  themeColor: "#F2EBD8",
  width: "device-width",
  initialScale: 1,
}

export default function JobsAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <JobsAuthProvider>
      {/* SVG filter for stamp ink irregularity (used by rubber stamps) */}
      <svg
        width="0"
        height="0"
        style={{ position: "absolute" }}
        aria-hidden="true"
      >
        <defs>
          <filter id="stamp-ink" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              seed="3"
            />
            <feDisplacementMap in="SourceGraphic" scale="0.8" />
          </filter>
        </defs>
      </svg>

      <div className="amtlich amtlich-paper amtlich-grain min-h-screen">
        <main className="relative z-10 mx-auto max-w-lg px-5 pt-6 pb-28">
          {children}
        </main>
        <BottomNav />
      </div>
    </JobsAuthProvider>
  )
}
