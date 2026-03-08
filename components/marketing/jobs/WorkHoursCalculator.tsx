"use client"

import { useState } from "react"
import Link from "next/link"

type VisaType = "eu" | "non-eu-study" | "non-eu-language"
type WorkPeriod = "semester" | "break"

const MINI_JOB_LIMIT = 538 // EUR/month tax-free threshold 2026

export function WorkHoursCalculator() {
  const [visaType, setVisaType] = useState<VisaType>("non-eu-study")
  const [workPeriod, setWorkPeriod] = useState<WorkPeriod>("semester")
  const [hoursPerWeek, setHoursPerWeek] = useState(15)
  const [hourlyRate, setHourlyRate] = useState(13)

  // Calculate results
  const monthlyEarnings = hoursPerWeek * hourlyRate * 4.33
  const yearlyEarnings = monthlyEarnings * 12

  let maxHoursPerWeek: number | null = null
  let yearlyDayLimit: string | null = null
  let warning: string | null = null
  let tip: string | null = null

  switch (visaType) {
    case "eu":
      maxHoursPerWeek = null // unlimited
      tip = "As an EU/EEA citizen, you have no work hour restrictions. You can work full-time alongside your studies."
      break
    case "non-eu-study":
      if (workPeriod === "semester") {
        maxHoursPerWeek = 20
        yearlyDayLimit = "120 full days OR 240 half days per year"
        if (hoursPerWeek > 20) {
          warning = "You exceed the 20h/week limit during semester! Werkstudent status allows max 20h/week while classes are in session."
        }
      } else {
        maxHoursPerWeek = null // unlimited during breaks
        yearlyDayLimit = "120 full days OR 240 half days per year total"
        tip = "During semester breaks, you can work unlimited hours. But this still counts toward your 120/240 day annual limit."
      }
      break
    case "non-eu-language":
      maxHoursPerWeek = null
      yearlyDayLimit = "120 full days OR 240 half days per year"
      tip = "Language course visa holders can work 120 full days or 240 half days per year. Check with your Ausländerbehörde for specifics."
      break
  }

  const isMiniJob = monthlyEarnings <= MINI_JOB_LIMIT
  const daysUsedPerMonth = workPeriod === "semester"
    ? Math.ceil((hoursPerWeek * 4.33) / 8)
    : Math.ceil((hoursPerWeek * 4.33) / 4) // half-days

  const remainingDays = visaType !== "eu"
    ? Math.max(0, 120 - daysUsedPerMonth * 12)
    : null

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Your visa type</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {([
              { value: "eu", label: "EU/EEA Citizen" },
              { value: "non-eu-study", label: "Non-EU Study Visa" },
              { value: "non-eu-language", label: "Language Course Visa" },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setVisaType(opt.value)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  visaType === opt.value
                    ? "bg-primary/10 border-2 border-primary text-white"
                    : "bg-white/5 border border-white/[0.08] text-gray-400 hover:text-white hover:border-white/[0.15]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {visaType === "non-eu-study" && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Current period</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setWorkPeriod("semester")}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  workPeriod === "semester"
                    ? "bg-primary/10 border-2 border-primary text-white"
                    : "bg-white/5 border border-white/[0.08] text-gray-400 hover:text-white"
                }`}
              >
                During Semester
              </button>
              <button
                onClick={() => setWorkPeriod("break")}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  workPeriod === "break"
                    ? "bg-primary/10 border-2 border-primary text-white"
                    : "bg-white/5 border border-white/[0.08] text-gray-400 hover:text-white"
                }`}
              >
                Semester Break
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Hours per week: {hoursPerWeek}h</label>
            <input
              type="range"
              min={1}
              max={40}
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(parseInt(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>1h</span>
              <span>40h</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Hourly rate: EUR {hourlyRate}</label>
            <input
              type="range"
              min={10}
              max={30}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(parseInt(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>EUR 10</span>
              <span>EUR 30</span>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ResultCard label="Monthly earnings" value={`EUR ${Math.round(monthlyEarnings).toLocaleString()}`} highlight />
        <ResultCard label="Yearly earnings" value={`EUR ${Math.round(yearlyEarnings).toLocaleString()}`} />
        <ResultCard
          label="Max hours/week"
          value={maxHoursPerWeek ? `${maxHoursPerWeek}h` : "Unlimited"}
        />
        <ResultCard
          label="Tax status"
          value={isMiniJob ? "Mini-job (tax free)" : "Subject to tax"}
          sub={isMiniJob ? `Under EUR ${MINI_JOB_LIMIT}/mo` : undefined}
        />
      </div>

      {/* Warnings and tips */}
      {warning && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          {warning}
        </div>
      )}

      {tip && (
        <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl text-sm text-gray-300">
          {tip}
        </div>
      )}

      {yearlyDayLimit && (
        <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl text-sm text-amber-300/80">
          Annual limit: {yearlyDayLimit}
          {remainingDays !== null && (
            <span className="block mt-1 text-xs text-gray-500">
              At your current pace, you&apos;d use ~{daysUsedPerMonth * 12} full-day equivalents per year ({remainingDays} days remaining)
            </span>
          )}
        </div>
      )}

      {/* Key rules */}
      <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Key Rules for 2026</h3>
        <ul className="space-y-3 text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span><strong className="text-gray-300">Minimum wage:</strong> EUR 12.82/hour (2026)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span><strong className="text-gray-300">Mini-job limit:</strong> EUR {MINI_JOB_LIMIT}/month — tax-free, no social insurance</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span><strong className="text-gray-300">Werkstudent:</strong> Max 20h/week during semester, unlimited during breaks. Student health insurance rates apply</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span><strong className="text-gray-300">Tax-free allowance:</strong> EUR 11,604/year basic allowance (2026). Earnings below this are income-tax-free</span>
          </li>
        </ul>
      </div>

      {/* CTA */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-6 text-center">
        <p className="text-gray-300 mb-3">Better German = better jobs = higher pay</p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/jobs/student-jobs"
            className="px-4 py-2 bg-white/5 border border-white/[0.1] text-white text-sm rounded-lg hover:bg-white/10 transition-all"
          >
            Browse Student Jobs
          </Link>
          <a
            href="https://wa.me/919028396035?text=Hi!%20I%20want%20to%20improve%20my%20German%20for%20working%20in%20Germany."
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-all"
          >
            Start Learning German
          </a>
        </div>
      </div>
    </div>
  )
}

function ResultCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? "bg-emerald-500/5 border border-emerald-500/10" : "bg-[#1a1a1a] border border-white/[0.08]"}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${highlight ? "text-emerald-400" : "text-white"}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  )
}
