import type { Metadata, Viewport } from "next"
import { Fraunces, Newsreader, JetBrains_Mono } from "next/font/google"
import { JobsAuthProvider } from "@/components/jobs-app/AuthProvider"
import { BottomNav } from "@/components/jobs-app/BottomNav"
import DocumentSerial from "@/components/jobs-app/DocumentSerial"
import PWAInstallPrompt from "@/components/PWAInstallPrompt"
import PushNotificationPrompt from "@/components/marketing/PushNotificationPrompt"
import "./amtlich.css"

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
})
const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-newsreader",
})
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://dayzero.xyz"),
  title: "Plan Beta Day Zero — Day Zero with us, Day One at work.",
  description:
    "The career companion for professionals on their way to Germany. Match with jobs, generate tailored CVs and cover letters, track applications, and prep for every interview.",
  manifest: "/day-zero-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Day Zero",
  },
  openGraph: {
    title: "Plan Beta Day Zero",
    description:
      "Day Zero with us, Day One at work. The career companion for professionals on their way to Germany.",
    url: "https://dayzero.xyz",
    siteName: "Plan Beta Day Zero",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/og-day-zero.png",
        width: 1200,
        height: 630,
        alt: "Plan Beta Day Zero — Day Zero with us, Day One at work.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Plan Beta Day Zero",
    description: "Day Zero with us, Day One at work.",
    images: ["/og-day-zero.png"],
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
      <div className={`${fraunces.variable} ${newsreader.variable} ${jetBrainsMono.variable}`}>
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
        <PWAInstallPrompt />
        <PushNotificationPrompt />
      </div>
      </div>
    </JobsAuthProvider>
  )
}
