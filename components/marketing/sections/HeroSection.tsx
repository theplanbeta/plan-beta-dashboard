"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { trackEvent } from "@/lib/tracking"

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
}

const item = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
}

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0a0a0a]">
        {/* Gradient Orbs */}
        <motion.div
          animate={{ y: [0, -30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{ y: [0, 20, 0], scale: [1, 1.05, 1] }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-orange-500/15 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-red-500/10 rounded-full blur-[100px]"
        />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div variants={item} className="inline-flex mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full text-sm text-gray-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                New batches starting March 2026
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={item}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight mb-6"
            >
              Your Journey to{" "}
              <span className="bg-gradient-to-r from-primary via-red-400 to-orange-400 bg-clip-text text-transparent">
                Germany
              </span>
              <br />
              Starts Here.
            </motion.h1>

            {/* Subtext */}
            <motion.p
              variants={item}
              className="text-lg sm:text-xl text-gray-400 mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed"
            >
              Master German with Kerala&apos;s most trusted language institute.
              Live classes. Expert teachers. Proven results.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={item}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link
                href="/site/contact"
                onClick={() => trackEvent("cta_click", { label: "contact_us", location: "hero" })}
                className="group inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white rounded-full bg-primary hover:bg-primary-dark transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02]"
              >
                Start Learning German
                <svg
                  className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform"
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
              <Link
                href="/site/courses"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white border border-white/20 rounded-full hover:bg-white/5 transition-all duration-300"
              >
                Explore Courses
              </Link>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              variants={item}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-6 mt-10 text-sm text-gray-500"
            >
              {["Expert teachers", "Small batches", "Flexible timings"].map(
                (text) => (
                  <div key={text} className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-green-500/70"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {text}
                  </div>
                )
              )}
            </motion.div>
          </motion.div>

          {/* Right Visual — Level Progress Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative hidden lg:block"
          >
            <div className="relative z-10 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-10 shadow-2xl">
              <div className="text-center mb-8">
                <div className="text-5xl mb-3">🇩🇪</div>
                <h3 className="text-xl font-bold text-white">
                  From Zero to Fluent
                </h3>
                <p className="text-gray-500 text-sm mt-1">
                  Your learning path
                </p>
              </div>

              <div className="space-y-5">
                {[
                  { level: "A1", name: "Beginner", done: true },
                  { level: "A2", name: "Elementary", done: true },
                  { level: "B1", name: "Intermediate", done: true },
                  { level: "B2", name: "Advanced", done: false },
                ].map((lvl, i) => (
                  <motion.div
                    key={lvl.level}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + i * 0.15 }}
                    className="flex items-center gap-4"
                  >
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold ${
                        lvl.done
                          ? "bg-gradient-to-br from-primary to-red-600 text-white"
                          : "bg-white/10 text-gray-400 border border-white/10"
                      }`}
                    >
                      {lvl.done ? "✓" : lvl.level}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-white text-sm font-medium">
                          {lvl.level} {lvl.name}
                        </span>
                        {lvl.done && (
                          <span className="text-xs text-green-400/70">
                            Complete
                          </span>
                        )}
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: lvl.done ? "100%" : "0%" }}
                          transition={{ duration: 1, delay: 1.2 + i * 0.2 }}
                          className="h-full bg-gradient-to-r from-primary to-orange-500 rounded-full"
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Floating Badge — Pass Rate */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 }}
              className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-lg">
                  🎓
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">95%</p>
                  <p className="text-xs text-gray-500">Pass Rate</p>
                </div>
              </div>
            </motion.div>

            {/* Floating Badge — Students */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.7 }}
              className="absolute -bottom-2 -left-4 bg-white rounded-2xl shadow-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex -space-x-1.5">
                  {["bg-primary", "bg-orange-500", "bg-blue-500", "bg-green-500"].map(
                    (bg, i) => (
                      <div
                        key={i}
                        className={`w-7 h-7 ${bg} rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold`}
                      >
                        {["A", "R", "S", "V"][i]}
                      </div>
                    )
                  )}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">2,500+</p>
                  <p className="text-xs text-gray-500">Students</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center pt-2">
          <div className="w-1 h-2 bg-white/40 rounded-full" />
        </div>
      </motion.div>
    </section>
  )
}
