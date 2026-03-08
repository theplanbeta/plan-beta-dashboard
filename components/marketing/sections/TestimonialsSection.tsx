"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AnimateInView } from "@/components/marketing/AnimateInView"
import { testimonials } from "@/lib/marketing-data"
import { trackEvent } from "@/lib/tracking"

export function TestimonialsSection() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const tracked = useRef(false)

  // Track when section scrolls into view
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !tracked.current) {
          tracked.current = true
          trackEvent("section_view", { section: "testimonials" })
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const next = useCallback(() => {
    setActive((prev) => (prev + 1) % testimonials.length)
  }, [])

  useEffect(() => {
    if (paused) return
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [paused, next])

  const t = testimonials[active]

  return (
    <section ref={sectionRef} className="relative py-32 bg-[#0a0a0a]">
      {/* Dot pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <AnimateInView className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Student Outcomes
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
            From Kerala to Germany
          </h2>
        </AnimateInView>

        {/* Testimonial */}
        <div
          className="relative min-h-[340px]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Large decorative quote */}
          <div className="absolute -top-8 left-0 text-[100px] sm:text-[180px] leading-none text-white/[0.04] font-serif select-none pointer-events-none">
            &ldquo;
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative z-10"
            >
              <blockquote className="text-xl sm:text-2xl text-gray-300 leading-relaxed mb-8 font-medium">
                &ldquo;{t.content}&rdquo;
              </blockquote>

              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 bg-gradient-to-br from-primary to-orange-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                  {t.avatar}
                </div>
                <div>
                  <p className="font-semibold text-white">{t.name}</p>
                  <p className="text-sm text-gray-500">From {t.fromCity}</p>
                </div>
              </div>

              {/* Outcome chips */}
              <div className="flex flex-wrap gap-2">
                {t.course && (
                  <span className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full border border-primary/20">
                    {t.course}
                  </span>
                )}
                {t.nowWorkingAs && (
                  <span className="inline-flex items-center px-3 py-1 bg-white/[0.06] text-gray-300 text-xs font-medium rounded-full border border-white/[0.08]">
                    {t.nowWorkingAs}
                  </span>
                )}
                {t.inCity && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/[0.06] text-gray-300 text-xs font-medium rounded-full border border-white/[0.08]">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {t.inCity}
                  </span>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-12">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`transition-all duration-300 rounded-full ${
                i === active
                  ? "w-8 h-2 bg-primary"
                  : "w-2 h-2 bg-white/20 hover:bg-white/40"
              }`}
              aria-label={`Show testimonial ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
