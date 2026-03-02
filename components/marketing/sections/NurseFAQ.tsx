"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AnimateInView } from "@/components/marketing/AnimateInView"
import { trackEvent } from "@/lib/tracking"

type FAQ = {
  question: string
  answer: string
}

function FAQItem({ faq, index }: { faq: FAQ; index: number }) {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = () => {
    const opening = !isOpen
    setIsOpen(opening)
    if (opening) {
      trackEvent("faq_expand", { question: faq.question.slice(0, 80) })
    }
  }

  return (
    <AnimateInView delay={index * 0.06}>
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden">
        <button
          onClick={handleToggle}
          className="flex items-center justify-between w-full px-6 py-4 text-left"
        >
          <span className="font-semibold text-white pr-4">{faq.question}</span>
          <motion.svg
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-5 h-5 text-gray-500 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-4 text-sm text-gray-400 leading-relaxed">
                {faq.answer}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimateInView>
  )
}

export function NurseFAQ({ faqs }: { faqs: FAQ[] }) {
  return (
    <section className="py-20 bg-[#111]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimateInView className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
        </AnimateInView>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <FAQItem key={faq.question} faq={faq} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
