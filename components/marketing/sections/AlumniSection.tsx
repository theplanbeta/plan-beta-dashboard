"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { AnimateInView } from "@/components/marketing/AnimateInView"
import { alumniHighlights } from "@/lib/marketing-data"
import { trackEvent } from "@/lib/tracking"

export function AlumniSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const tracked = useRef(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !tracked.current) {
          tracked.current = true
          trackEvent("section_view", { section: "alumni" })
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="py-32 bg-[#111] relative overflow-hidden">
      <div className="blur-orb absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[80px]" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <AnimateInView className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Alumni Network
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
            Join 500+ PlanBeta Alumni in Germany
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Our alumni across Germany help new students with guidance, job leads, and community support.
          </p>
        </AnimateInView>

        {/* Alumni Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {alumniHighlights.map((alumni, index) => (
            <AnimateInView key={index} delay={index * 0.08}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {alumni.name[0]}
                  </div>

                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{alumni.name}</p>
                    <p className="text-sm text-gray-400">{alumni.role}</p>
                    <p className="text-sm text-primary font-medium flex items-center gap-1">
                      <svg
                        className="w-3.5 h-3.5 flex-shrink-0"
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
                      {alumni.city}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimateInView>
          ))}
        </div>

        {/* Footer text */}
        <AnimateInView className="text-center mt-10">
          <p className="text-gray-500 text-sm">
            And 494 more alumni across Germany...
          </p>
        </AnimateInView>
      </div>
    </section>
  )
}
