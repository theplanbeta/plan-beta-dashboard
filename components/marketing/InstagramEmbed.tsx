"use client"

import Link from "next/link"

interface InstagramEmbedProps {
  url: string
  title?: string
  thumbnail: string // path to static image in /public
  isVideo?: boolean
}

export function InstagramEmbed({ url, title, thumbnail, isVideo = true }: InstagramEmbedProps) {
  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block w-full max-w-sm rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.04] hover:border-white/[0.15] transition-all"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={thumbnail}
          alt={title || "Instagram post"}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Play button for videos */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 group-hover:bg-white/30 group-hover:scale-110 transition-all">
              <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Instagram icon + title at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {title && (
            <p className="text-white text-sm font-medium leading-snug mb-2 drop-shadow-lg">
              {title}
            </p>
          )}
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-white/70" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z" />
            </svg>
            <span className="text-white/60 text-xs">Watch on Instagram</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
