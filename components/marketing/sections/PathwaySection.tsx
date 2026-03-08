"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { AnimateInView } from "@/components/marketing/AnimateInView"
import { pathwaySteps } from "@/lib/marketing-data"
import { trackEvent } from "@/lib/tracking"

const stepIcons: Record<string, string> = {
  clipboard:
    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  book: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  award:
    "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  plane:
    "M12 19l9 2-9-18-9 18 9-2zm0 0v-8",
  flag: "M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z",
}

export function PathwaySection() {
  const sectionRef = useRef<HTMLElement>(null)
  const tracked = useRef(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !tracked.current) {
          tracked.current = true
          trackEvent("section_view", { section: "pathway" })
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="py-32 bg-[#0a0a0a] relative overflow-hidden">
      <div className="blur-orb absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[80px]" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <AnimateInView className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Your Germany Pathway
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-4">
            The PlanBeta Germany Pathway
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            From your first German word to your first day in Germany — the proven path 500+ alumni have followed.
          </p>
        </AnimateInView>

        {/* Steps */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />

          <div className="space-y-10">
            {pathwaySteps.map((step, index) => (
              <AnimateInView key={index} delay={index * 0.1}>
                <div className="relative flex gap-4 sm:gap-6">
                  {/* Number circle */}
                  <div className="relative z-10 flex-shrink-0 w-12 h-12 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold text-lg">{index + 1}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-3 mb-2">
                      <svg
                        className="w-5 h-5 text-primary flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d={stepIcons[step.icon] || stepIcons.clipboard}
                        />
                      </svg>
                      <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                    </div>
                    <p className="text-gray-400 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </AnimateInView>
            ))}
          </div>
        </div>

        {/* CTA */}
        <AnimateInView className="text-center mt-14">
          <Link
            href="/contact"
            onClick={() =>
              trackEvent("cta_click", {
                label: "begin_pathway",
                location: "pathway_section",
              })
            }
            className="inline-flex items-center justify-center px-8 py-3.5 bg-primary text-white font-semibold rounded-full hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
          >
            Begin Your Pathway
            <svg
              className="w-4 h-4 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </AnimateInView>
      </div>
    </section>
  )
}
