import type { Metadata, Viewport } from "next"
import { JobsAuthProvider } from "@/components/jobs-app/AuthProvider"
import { BottomNav } from "@/components/jobs-app/BottomNav"
import DocumentSerial from "@/components/jobs-app/DocumentSerial"
import "./amtlich.css"

export const metadata: Metadata = {
  title: "PlanBeta Jobs — Your Application Folder",
  description:
    "AI-powered job matching, CV generation, and interview prep for Indian professionals targeting the German job market.",
  manifest: "/jobs-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PB Jobs",
  },
}

export const viewport: Viewport = {
  themeColor: "#FBF6E7",
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
      {/* SVG filter for stamp ink irregularity */}
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

      <div className="amtlich amtlich-paper min-h-screen">
        {/* Document serial — top-right of every screen */}
        <div className="mx-auto flex max-w-lg items-center justify-end px-5 pt-4">
          <DocumentSerial />
        </div>

        <main className="relative mx-auto max-w-lg px-5 pt-2 pb-28">
          {children}
        </main>
        <BottomNav />
      </div>
    </JobsAuthProvider>
  )
}
