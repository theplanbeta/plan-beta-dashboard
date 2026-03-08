"use client"

import Link from "next/link"
import { AnimateInView } from "@/components/marketing/AnimateInView"
import { trackEvent } from "@/lib/tracking"

const pages = [
  {
    title: "For Nurses",
    desc: "Dedicated pathway for Indian nurses to work in Germany. B1/B2 training, visa guidance, and job placement support.",
    href: "/nurses",
    color: "from-pink-500/20 to-rose-500/20",
    borderHover: "hover:border-pink-500/30",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
  },
  {
    title: "Eligibility Checker",
    desc: "Find out if you qualify to work in Germany. Get a personalized pathway with visa options and timeline.",
    href: "/germany-pathway",
    color: "from-violet-500/20 to-purple-500/20",
    borderHover: "hover:border-violet-500/30",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: "Jobs in Germany",
    desc: "Browse real job openings in Germany. Filter by profession, city, and German level required.",
    href: "/jobs",
    color: "from-blue-500/20 to-cyan-500/20",
    borderHover: "hover:border-blue-500/30",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
    ),
  },
  {
    title: "Opportunities",
    desc: "Discover career pathways in Germany across nursing, IT, engineering, and more.",
    href: "/opportunities",
    color: "from-amber-500/20 to-orange-500/20",
    borderHover: "hover:border-amber-500/30",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  },
  {
    title: "About Us",
    desc: "Meet the team behind Plan Beta. Our story, mission, and the journey so far.",
    href: "/about",
    color: "from-emerald-500/20 to-green-500/20",
    borderHover: "hover:border-emerald-500/30",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    title: "Blog",
    desc: "Tips on learning German, life in Germany, visa updates, and student stories.",
    href: "/blog",
    color: "from-teal-500/20 to-emerald-500/20",
    borderHover: "hover:border-teal-500/30",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
      </svg>
    ),
  },
]

export function ExploreSection() {
  return (
    <section className="relative py-24 sm:py-32 bg-[#0a0a0a] overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(210,48,44,0.05),transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimateInView className="text-center mb-12 sm:mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Explore
          </p>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
            Everything You Need for Germany
          </h2>
          <p className="text-gray-400 text-lg mt-4 max-w-2xl mx-auto">
            From eligibility checks to job search — we&apos;ve got every step covered.
          </p>
        </AnimateInView>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map((page, i) => (
            <AnimateInView key={page.href} delay={i * 0.06}>
              <Link
                href={page.href}
                onClick={() => trackEvent("explore_click", { page: page.title })}
                className={`group relative block h-full rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-6 lg:p-8 transition-all duration-300 ${page.borderHover} hover:bg-white/[0.04]`}
              >
                {/* Gradient glow on hover */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${page.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                    {page.icon}
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-white transition-colors">
                    {page.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed group-hover:text-gray-400 transition-colors">
                    {page.desc}
                  </p>

                  <div className="mt-5 inline-flex items-center text-sm font-medium text-gray-600 group-hover:text-white transition-colors">
                    Learn more
                    <svg
                      className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
