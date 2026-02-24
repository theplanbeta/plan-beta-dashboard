"use client"

import { useRef, useEffect, useState } from "react"
import { useInView } from "framer-motion"
import { stats, marqueeItems } from "@/lib/marketing-data"

function useCounter(end: number, duration = 2000, isInView: boolean, decimal = false) {
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
        setCount(decimal ? Math.round(start * 10) / 10 : Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [isInView, end, duration, decimal])
  return decimal ? count.toFixed(1) : count.toLocaleString()
}

function StatItem({ stat }: { stat: typeof stats[number] }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const value = useCounter(stat.number, 2000, isInView, stat.decimal)

  return (
    <div ref={ref} className="text-center px-6">
      <div className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
        {value}
        <span className="text-primary">{stat.suffix}</span>
      </div>
      <div className="text-xs sm:text-sm text-gray-500 mt-1">{stat.label}</div>
    </div>
  )
}

export function SocialProofStrip() {
  return (
    <section className="bg-[#050505] border-y border-white/5 py-8 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Marquee */}
          <div className="flex-1 overflow-hidden relative w-full lg:w-auto">
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#050505] to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#050505] to-transparent z-10" />
            <div className="animate-marquee whitespace-nowrap flex items-center gap-8">
              {[...marqueeItems, ...marqueeItems].map((text, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 text-sm text-gray-500"
                >
                  <span className="w-1 h-1 bg-primary/60 rounded-full flex-shrink-0" />
                  {text}
                </span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center divide-x divide-white/10 flex-shrink-0">
            {stats.map((stat) => (
              <StatItem key={stat.label} stat={stat} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
