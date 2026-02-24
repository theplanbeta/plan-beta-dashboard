"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { AnimateInView } from "@/components/marketing/AnimateInView"
import { VideoBackground } from "@/components/marketing/VideoBackground"

const opportunities = [
  {
    icon: "🏥",
    title: "200,000+ Nursing Jobs",
    desc: "Healthcare sector desperately needs qualified nurses from India.",
  },
  {
    icon: "⚙️",
    title: "100,000+ Engineers Needed",
    desc: "Industrial powerhouse needs technical talent across all disciplines.",
  },
  {
    icon: "💻",
    title: "Booming IT Sector",
    desc: "Berlin, Munich, Hamburg — tech companies actively hiring international talent.",
  },
]

export function GermanyOpportunity() {
  return (
    <section className="py-32 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Content */}
          <div>
            <AnimateInView>
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
                Opportunities
              </p>
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-6">
                Germany Needs{" "}
                <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                  You
                </span>
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-10">
                Germany is facing its biggest skilled worker shortage. With the
                right qualifications and German language skills, a new life
                awaits.
              </p>
            </AnimateInView>

            <div className="space-y-6 mb-10">
              {opportunities.map((opp, i) => (
                <AnimateInView key={opp.title} delay={i * 0.1}>
                  <div className="flex items-start gap-5 p-5 rounded-2xl hover:bg-gray-50 transition-colors">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                      {opp.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {opp.title}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">{opp.desc}</p>
                    </div>
                  </div>
                </AnimateInView>
              ))}
            </div>

            <AnimateInView delay={0.3}>
              <Link
                href="/site/opportunities"
                className="group inline-flex items-center px-6 py-3 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-all"
              >
                Explore All Opportunities
                <svg
                  className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
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

          {/* Visual — Abstract German Flag */}
          <AnimateInView direction="right" className="relative hidden lg:block">
            <motion.div
              initial={{ scale: 0.9, rotate: -3 }}
              whileInView={{ scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl"
            >
              {/* Video Background */}
              <VideoBackground
                src="/videos/germany-cityscape.mp4"
                overlay="bg-black/40"
                hideOnMobile={false}
              />

              {/* Fallback for when video hasn't loaded */}
              <div className="absolute inset-0 flex flex-col">
                <div className="flex-1 bg-gray-900" />
                <div className="flex-1 bg-primary" />
                <div className="flex-1 bg-amber-400" />
              </div>

              {/* Overlay with stats */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                <div className="text-center text-white">
                  <p className="text-3xl font-bold mb-2">Your Future Awaits</p>
                  <p className="text-white/70 text-lg">
                    €4,500/month average salary
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-8">
                    <div>
                      <p className="text-2xl font-bold">30</p>
                      <p className="text-xs text-white/60">Days Leave</p>
                    </div>
                    <div className="w-px h-8 bg-white/20" />
                    <div>
                      <p className="text-2xl font-bold">Free</p>
                      <p className="text-xs text-white/60">Healthcare</p>
                    </div>
                    <div className="w-px h-8 bg-white/20" />
                    <div>
                      <p className="text-2xl font-bold">26</p>
                      <p className="text-xs text-white/60">EU Countries</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimateInView>
        </div>
      </div>
    </section>
  )
}
