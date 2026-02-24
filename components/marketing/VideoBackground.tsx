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
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mq.matches)
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) return
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [prefersReducedMotion])

  if (prefersReducedMotion) return null

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
          autoPlay
          muted
          loop
          playsInline
          poster={poster}
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={src} type="video/mp4" />
        </video>
      )}
      {overlay && <div className={`absolute inset-0 ${overlay}`} />}
    </div>
  )
}
