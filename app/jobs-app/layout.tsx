import type { Metadata, Viewport } from "next"
import { JobsAuthProvider } from "@/components/jobs-app/AuthProvider"
import { BottomNav } from "@/components/jobs-app/BottomNav"

export const metadata: Metadata = {
  title: "PlanBeta Jobs — AI Career Companion",
  description:
    "AI-powered job matching, CV generation, and interview prep for the German job market",
  manifest: "/jobs-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PB Jobs",
  },
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
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
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <main className="max-w-lg mx-auto px-4 py-4 pb-16">
          {children}
        </main>
        <BottomNav />
      </div>
    </JobsAuthProvider>
  )
}
