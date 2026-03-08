"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { AnimateInView } from "@/components/marketing/AnimateInView"

type FAQ = { question: string; answer: string }

function FAQItem({
  faq,
  index,
}: {
  faq: FAQ
  index: number
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <AnimateInView delay={index * 0.05}>
      <div className="border-b border-white/[0.06] last:border-0">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between py-6 text-left group"
        >
          <span className="text-base sm:text-lg font-semibold text-white pr-4 sm:pr-8 group-hover:text-primary transition-colors">
            {faq.question}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 w-8 h-8 bg-white/[0.06] rounded-full flex items-center justify-center group-hover:bg-primary/10 transition-colors"
          >
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v12M6 12h12"
              />
            </svg>
          </motion.div>
        </button>
        <motion.div
          initial={false}
          animate={{
            height: isOpen ? "auto" : 0,
            opacity: isOpen ? 1 : 0,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          style={{ overflow: "hidden" }}
        >
          <p className="pb-6 text-gray-400 leading-relaxed pr-12">
            {faq.answer}
          </p>
        </motion.div>
      </div>
    </AnimateInView>
  )
}

export function FAQSection({ faqs }: { faqs: FAQ[] }) {
  return (
    <section className="py-32 bg-[#111]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <AnimateInView className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            FAQ
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Got Questions?
          </h2>
        </AnimateInView>

        {/* Accordion */}
        <div>
          {faqs.map((faq, index) => (
            <FAQItem key={index} faq={faq} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
