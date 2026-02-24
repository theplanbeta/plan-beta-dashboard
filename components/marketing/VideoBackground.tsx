"use client"

import { useEffect, useRef, useState, useCallback } from "react"

type Props = {
  src: string
  poster?: string
  className?: string
  overlay?: string
  hideOnMobile?: boolean
}

export function VideoBackground({
  src,
  poster,
  className,
  overlay,
  hideOnMobile = true,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)

  // Lazy-load: start loading video when container is near the viewport
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Check reduced motion preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Explicitly play once video can play — handles browser autoplay quirks
  const handleCanPlay = useCallback(() => {
    const video = videoRef.current
    if (video) {
      video.play().catch(() => {
        // Autoplay blocked — video stays as poster/first-frame fallback
      })
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden ${
        hideOnMobile ? "hidden md:block" : ""
      } ${className ?? ""}`}
    >
      {shouldLoad && (
        <video
          ref={videoRef}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          poster={poster}
          preload="auto"
          onCanPlay={handleCanPlay}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {overlay && <div className={`absolute inset-0 ${overlay}`} />}
    </div>
  )
}
