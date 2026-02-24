"use client"

import { useRef, useEffect, useState } from "react"
import { useInView } from "framer-motion"
import { AnimateInView } from "@/components/marketing/AnimateInView"

function useCounter(end: number, duration = 2000, isInView: boolean) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!isInView) return
    let start = 0
    const increment = end / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [isInView, end, duration])
  return count.toLocaleString()
}

const stats = [
  { value: 200000, suffix: "+", label: "Nursing vacancies in Germany", type: "count" as const },
  { display: "€2,800–4,500", label: "Monthly salary", type: "text" as const },
  { display: "BSc / GNM", label: "Qualification required", type: "text" as const },
  { display: "B2", label: "Language level required", type: "text" as const },
]

function CountStat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const count = useCounter(value, 2000, isInView)

  return (
    <div ref={ref} className="py-10 px-6 text-center">
      <div className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
        {count}
        <span className="text-primary">{suffix}</span>
      </div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  )
}

export function NurseStats() {
  return (
    <section className="bg-[#050505] border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/10">
          {stats.map((stat, i) =>
            stat.type === "count" ? (
              <CountStat
                key={stat.label}
                value={stat.value!}
                suffix={stat.suffix!}
                label={stat.label}
              />
            ) : (
              <AnimateInView key={stat.label} delay={i * 0.1} direction="none">
                <div className="py-10 px-6 text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-white">
                    {stat.display}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                </div>
              </AnimateInView>
            )
          )}
        </div>
      </div>
    </section>
  )
}
