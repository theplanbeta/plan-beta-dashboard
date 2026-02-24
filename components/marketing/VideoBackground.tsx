"use client"

import { useEffect, useRef, useState } from "react"

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
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  // Lazy-load: only set video src when container scrolls into view
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "200px" } // Start loading 200px before visible
    )

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Play video once it's loaded and visible
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isVisible) return
    video.play().catch(() => {})
  }, [isVisible])

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden ${
        hideOnMobile ? "hidden md:block" : ""
      } ${className ?? ""}`}
    >
      {isVisible && (
        <video
          ref={videoRef}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          poster={poster}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {overlay && <div className={`absolute inset-0 ${overlay}`} />}
    </div>
  )
}
