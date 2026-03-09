"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { AnimateInView } from "@/components/marketing/AnimateInView"
import { trackEvent } from "@/lib/tracking"

const NICHES = [
  {
    title: "Student Jobs",
    desc: "Werkstudent, mini-jobs & part-time work",
    href: "/jobs/student-jobs",
    color: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
  },
  {
    title: "Nursing Jobs",
    desc: "Hospital & healthcare positions",
    href: "/jobs/nursing",
    color: "from-rose-500 to-pink-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20 hover:border-rose-500/40",
  },
  {
    title: "Engineering Jobs",
    desc: "IT, mechanical & electrical roles",
    href: "/jobs/engineering",
    color: "from-blue-500 to-indigo-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20 hover:border-blue-500/40",
  },
]

export function JobPortalSection() {
  const [stats, setStats] = useState<{ total: number; newToday: number } | null>(null)

  useEffect(() => {
    fetch("/api/jobs?niche=student-jobs&limit=1")
      .then((r) => r.json())
      .then((d) => {
        setStats({ total: d.pagination?.totalCount || 0, newToday: 0 })
      })
      .catch(() => {})
  }, [])

  return (
    <section className="relative py-24 sm:py-32 bg-[#0a0a0a] overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.08),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.06),transparent_60%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left — Content */}
          <div>
            <AnimateInView>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-emerald-400">Community Initiative</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6">
                Find Your Next Job in{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                  Germany
                </span>
              </h2>
              <p className="text-lg text-gray-400 leading-relaxed mb-8">
                A free job portal for international students and professionals in Germany.
                Real positions from top companies, updated daily. Better German = better opportunities.
              </p>
            </AnimateInView>

            {/* Live stats */}
            <AnimateInView delay={0.1}>
              <div className="flex items-center gap-6 mb-10">
                {stats && stats.total > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-white">{stats.total.toLocaleString()}</span>
                    <span className="text-sm text-gray-500">active jobs</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-white">18</span>
                  <span className="text-sm text-gray-500">cities covered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-white">Free</span>
                  <span className="text-sm text-gray-500">to use</span>
                </div>
              </div>
            </AnimateInView>

            <AnimateInView delay={0.2}>
              <Link
                href="/jobs/student-jobs"
                onClick={() => trackEvent("homepage_job_portal_click", { niche: "student-jobs" })}
                className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-full hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300"
              >
                Browse Student Jobs
                <svg
                  className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </AnimateInView>
          </div>

          {/* Right — Niche cards */}
          <div className="space-y-4">
            {NICHES.map((niche, i) => (
              <AnimateInView key={niche.href} delay={i * 0.1} direction="right">
                <Link
                  href={niche.href}
                  onClick={() => trackEvent("homepage_job_portal_click", { niche: niche.title })}
                  className={`group relative flex items-center gap-5 p-5 sm:p-6 rounded-2xl border ${niche.border} ${niche.bg} transition-all duration-300 hover:translate-x-1`}
                >
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${niche.color} flex items-center justify-center flex-shrink-0`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white group-hover:text-white transition-colors">
                      {niche.title}
                    </h3>
                    <p className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors">
                      {niche.desc}
                    </p>
                  </div>

                  {/* Arrow */}
                  <svg
                    className="w-5 h-5 text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </AnimateInView>
            ))}

            {/* Bottom note */}
            <AnimateInView delay={0.3}>
              <p className="text-center text-xs text-gray-600 mt-4">
                Powered by Plan Beta — jobs scraped daily from top German employers
              </p>
            </AnimateInView>
          </div>
        </div>
      </div>
    </section>
  )
}
