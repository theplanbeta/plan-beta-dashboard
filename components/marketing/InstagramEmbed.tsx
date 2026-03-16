"use client"

import { useEffect, useRef, useState } from "react"

interface InstagramEmbedProps {
  url: string
  title?: string
  maxWidth?: number
}

// Load the Instagram embed script once globally
let scriptLoaded = false
let scriptLoading = false
const callbacks: (() => void)[] = []

function loadInstagramScript(callback: () => void) {
  if (scriptLoaded) {
    callback()
    return
  }
  callbacks.push(callback)
  if (scriptLoading) return
  scriptLoading = true

  const script = document.createElement("script")
  script.src = "https://www.instagram.com/embed.js"
  script.async = true
  script.onload = () => {
    scriptLoaded = true
    callbacks.forEach((cb) => cb())
    callbacks.length = 0
  }
  document.body.appendChild(script)
}

export function InstagramEmbed({ url, title, maxWidth = 400 }: InstagramEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  // Lazy load — only render when in viewport
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Process embed after visible
  useEffect(() => {
    if (!visible) return
    loadInstagramScript(() => {
      if ((window as any).instgrm) {
        (window as any).instgrm.Embeds.process()
      }
    })
  }, [visible])

  // Extract post ID for the blockquote embed format
  const cleanUrl = url.replace(/\/$/, "")

  return (
    <div
      ref={containerRef}
      className="instagram-embed-container rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.04]"
      style={{ maxWidth, width: "100%" }}
    >
      {visible ? (
        <blockquote
          className="instagram-media"
          data-instgrm-captioned
          data-instgrm-permalink={cleanUrl}
          data-instgrm-version="14"
          style={{
            background: "transparent",
            border: 0,
            margin: 0,
            padding: 0,
            width: "100%",
            maxWidth: "100%",
          }}
        >
          <a href={cleanUrl} target="_blank" rel="noopener noreferrer" className="block p-6 text-center">
            <p className="text-gray-400 text-sm">{title || "View on Instagram"}</p>
          </a>
        </blockquote>
      ) : (
        <div
          className="flex items-center justify-center bg-white/[0.02]"
          style={{ minHeight: 400, maxWidth }}
        >
          <div className="text-center text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-2 opacity-40" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            <p className="text-xs">Loading...</p>
          </div>
        </div>
      )}
    </div>
  )
}
