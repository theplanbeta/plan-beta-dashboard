"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { AnimateInView } from "@/components/marketing/AnimateInView"
import { courses } from "@/lib/marketing-data"

export function CoursesSection() {
  return (
    <section className="py-32 bg-slate-900 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-[150px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <AnimateInView className="text-center mb-20">
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

        {/* Course Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {courses.map((course, index) => (
            <AnimateInView key={course.id} delay={index * 0.12}>
              <motion.div
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={`relative group bg-white/[0.04] backdrop-blur-sm border rounded-3xl p-8 h-full flex flex-col ${
                  course.popular
                    ? "border-primary/50 ring-1 ring-primary/20"
                    : "border-white/10"
                }`}
              >
                {course.popular && (
                  <motion.div
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-xs font-semibold rounded-full"
                  >
                    Most Popular
                  </motion.div>
                )}

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
                  className={`block w-full text-center py-3.5 rounded-full font-semibold text-sm transition-all duration-300 mt-auto ${
                    course.popular
                      ? "bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/20"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
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
