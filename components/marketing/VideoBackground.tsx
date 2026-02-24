"use client"

import { useEffect, useRef } from "react"

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

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    // Force play on mount — handles all autoplay edge cases
    video.play().catch(() => {})
  }, [])

  return (
    <div
      className={`absolute inset-0 overflow-hidden ${
        hideOnMobile ? "hidden md:block" : ""
      } ${className ?? ""}`}
    >
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
      {overlay && <div className={`absolute inset-0 ${overlay}`} />}
    </div>
  )
}
