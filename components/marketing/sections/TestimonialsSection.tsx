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

  return (
    <section ref={sectionRef} className="relative py-32 bg-[#0a0a0a]">
      {/* Dot pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <AnimateInView className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Success Stories
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Hear From Our Students
          </h2>
        </AnimateInView>

        {/* Testimonial */}
        <div
          className="relative min-h-[300px]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Large decorative quote */}
          <div className="absolute -top-8 left-0 text-[180px] leading-none text-white/[0.04] font-serif select-none pointer-events-none">
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
                &ldquo;{testimonials[active].content}&rdquo;
              </blockquote>

              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-primary to-orange-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                  {testimonials[active].avatar}
                </div>
                <div>
                  <p className="font-semibold text-white">
                    {testimonials[active].name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {testimonials[active].role}
                  </p>
                  <p className="text-sm text-primary font-medium">
                    {testimonials[active].location}
                  </p>
                </div>
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
