"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { AnimateInView } from "@/components/marketing/AnimateInView"
import { courses, selfPacedCourse } from "@/lib/marketing-data"
import { trackEvent } from "@/lib/tracking"

export function CoursesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const tracked = useRef(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !tracked.current) {
          tracked.current = true
          trackEvent("section_view", { section: "courses" })
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="py-32 bg-[#111] relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-[150px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <AnimateInView className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Our Courses
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
            Choose Your Path
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            From complete beginner to advanced — structured courses designed for
            your success.
          </p>
        </AnimateInView>

        {/* Featured Self-Paced Course */}
        <AnimateInView className="mb-12">
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative bg-white/[0.04] backdrop-blur-sm border border-primary/30 ring-1 ring-primary/10 rounded-3xl overflow-hidden"
          >
            {/* Featured badge */}
            <div className="absolute top-6 right-6 z-10">
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-full shadow-lg shadow-primary/25"
              >
                Crown Jewel
              </motion.div>
            </div>

            <div className="grid lg:grid-cols-2 gap-0">
              {/* Left — Content */}
              <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-5">
                  <span className="px-3 py-1 bg-orange-500/15 text-orange-400 text-xs font-medium rounded-full border border-orange-500/20">
                    Self-Paced
                  </span>
                  <span className="px-3 py-1 bg-white/[0.06] text-gray-400 text-xs font-medium rounded-full border border-white/[0.08]">
                    Malayalam
                  </span>
                  <span className="px-3 py-1 bg-white/[0.06] text-gray-400 text-xs font-medium rounded-full border border-white/[0.08]">
                    Lifetime Access
                  </span>
                </div>

                <h3 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                  {selfPacedCourse.title}
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  Taught by Aparna Bose, Founder
                </p>
                <p className="text-gray-400 leading-relaxed mb-8 max-w-lg">
                  {selfPacedCourse.description}
                </p>

                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                  {selfPacedCourse.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center text-sm text-gray-300"
                    >
                      <svg
                        className="w-4 h-4 text-primary mr-2.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/site/contact"
                  onClick={() => trackEvent("cta_click", { label: "start_learning", location: "courses_section" })}
                  className="inline-flex items-center justify-center px-8 py-3.5 bg-primary text-white font-semibold rounded-full hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
                >
                  Start Learning
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>

              {/* Right — Stats Grid */}
              <div className="p-8 sm:p-10 lg:p-12 flex items-center">
                <div className="grid grid-cols-2 gap-4 w-full">
                  {[
                    { value: "100+", label: "Video Lessons", icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
                    { value: "50+", label: "Exercises", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
                    { value: "Native", label: "Speaker Audio", icon: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" },
                    { value: "Lifetime", label: "Access", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
                  ].map((stat) => (
                    <motion.div
                      key={stat.label}
                      whileHover={{ scale: 1.03 }}
                      className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 text-center hover:border-primary/20 transition-colors"
                    >
                      <div className="w-10 h-10 mx-auto mb-3 bg-primary/10 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={stat.icon} />
                        </svg>
                      </div>
                      <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimateInView>

        {/* Live Courses */}
        <AnimateInView>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-6">
            Live Batch Courses
          </p>
        </AnimateInView>

        <div className="grid md:grid-cols-3 gap-6">
          {courses.map((course, index) => (
            <AnimateInView key={course.id} delay={index * 0.12}>
              <motion.div
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="relative group bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-3xl p-8 h-full flex flex-col"
              >
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${course.color} rounded-2xl flex items-center justify-center text-white text-lg font-bold mb-6`}
                >
                  {course.level[0]}
                </div>

                <h3 className="text-2xl font-bold text-white mb-1">
                  {course.title}
                </h3>
                <p className="text-sm text-gray-500 mb-4">{course.subtitle}</p>
                <p className="text-gray-400 text-sm mb-6 flex-grow">
                  {course.description}
                </p>

                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-3xl font-bold text-white">
                    ₹{course.price.toLocaleString()}
                  </span>
                  <span className="text-base text-gray-600 line-through">
                    ₹{course.originalPrice.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500 mb-6">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {course.duration}
                  </span>
                  <span className="w-1 h-1 bg-gray-600 rounded-full" />
                  <span>{course.level}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {course.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center text-sm text-gray-400"
                    >
                      <svg
                        className="w-4 h-4 text-green-500/60 mr-3 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/site/contact"
                  className="block w-full text-center py-3.5 rounded-full font-semibold text-sm transition-all duration-300 mt-auto bg-white/10 text-white hover:bg-white/20"
                >
                  Get Started
                </Link>
              </motion.div>
            </AnimateInView>
          ))}
        </div>

        {/* View All */}
        <AnimateInView className="text-center mt-12">
          <Link
            href="/site/courses"
            className="group inline-flex items-center text-sm font-semibold text-gray-400 hover:text-white transition-colors"
          >
            View all courses and pricing
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
    </section>
  )
}
