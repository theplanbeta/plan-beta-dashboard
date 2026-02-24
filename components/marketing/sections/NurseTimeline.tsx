"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { AnimateInView } from "@/components/marketing/AnimateInView"

const steps = [
  {
    step: "01",
    title: "Apply",
    description: "Submit your details. We assess your qualifications and eligibility for the German nursing program.",
  },
  {
    step: "02",
    title: "Learn German",
    description: "German language training from your current level up to B2 — the level required for nursing recognition in Germany.",
  },
  {
    step: "03",
    title: "Get Certified",
    description: "Prepare for and clear the B2 Goethe/TELC exam. We guide you through the entire certification process.",
  },
  {
    step: "04",
    title: "Start Working",
    description: "We connect you with hospitals and elderly care homes in Germany. Visa support and relocation assistance included.",
  },
]

export function NurseTimeline() {
  const lineRef = useRef(null)
  const isInView = useInView(lineRef, { once: true, amount: 0.3 })

  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimateInView className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            From application to your first day in a German hospital — a clear, supported journey.
          </p>
        </AnimateInView>

        <div ref={lineRef} className="relative max-w-4xl mx-auto">
          {/* Animated vertical line */}
          <div className="absolute left-8 lg:left-1/2 top-0 bottom-0 w-px lg:-translate-x-px">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
              transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-full h-full bg-gradient-to-b from-primary via-primary to-primary/20 origin-top"
            />
          </div>

          {/* Steps */}
          <div className="space-y-12 lg:space-y-16">
            {steps.map((step, index) => {
              const isEven = index % 2 === 0
              return (
                <AnimateInView
                  key={step.step}
                  delay={index * 0.15}
                  direction={isEven ? "left" : "right"}
                >
                  <div className={`relative flex items-start gap-6 lg:gap-0 ${
                    isEven ? "lg:flex-row" : "lg:flex-row-reverse"
                  }`}>
                    {/* Step circle */}
                    <div className="absolute left-8 lg:left-1/2 -translate-x-1/2 z-10">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={isInView ? { scale: 1 } : { scale: 0 }}
                        transition={{ delay: 0.3 + index * 0.2, type: "spring", stiffness: 300, damping: 20 }}
                        className="w-16 h-16 bg-white border-4 border-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/20"
                      >
                        <span className="text-primary font-bold text-lg">{step.step}</span>
                      </motion.div>
                    </div>

                    {/* Content card */}
                    <div className={`ml-20 lg:ml-0 lg:w-[calc(50%-3rem)] ${
                      isEven ? "lg:pr-8" : "lg:pl-8 lg:ml-auto"
                    }`}>
                      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  </div>
                </AnimateInView>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
