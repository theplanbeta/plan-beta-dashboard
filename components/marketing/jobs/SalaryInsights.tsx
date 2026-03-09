"use client"

import { useEffect, useState } from "react"
import { usePortalAuth } from "./JobPortalAuthProvider"
import { PremiumGate } from "./PremiumGate"

interface SalaryData {
  summary: {
    totalJobsWithSalary: number
    avgSalaryMin: number
    avgSalaryMax: number
    medianSalaryMin: number
  }
  byCity?: { city: string; avg: number; max: number; count: number }[]
  byJobType?: { type: string; avg: number; count: number }[]
  byGermanLevel?: { level: string; avg: number; count: number }[]
  isPremium: boolean
}

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  WORKING_STUDENT: "Working Student",
  Unknown: "Not Specified",
}

export function SalaryInsights() {
  const { isPremium } = usePortalAuth()
  const [data, setData] = useState<SalaryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("pb-jobs-token")
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`

    fetch("/api/jobs/salary-insights", { headers })
      .then((res) => res.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isPremium])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-white/[0.05] rounded-xl" />
        ))}
      </div>
    )
  }

  if (!data) return <p className="text-gray-500">No salary data available yet.</p>

  return (
    <div className="space-y-8">
      {/* Summary cards (free) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Jobs with salary data" value={data.summary.totalJobsWithSalary.toString()} />
        <StatCard label="Avg. minimum salary" value={`EUR ${data.summary.avgSalaryMin.toLocaleString()}`} sub="/month" />
        <StatCard label="Avg. maximum salary" value={`EUR ${data.summary.avgSalaryMax.toLocaleString()}`} sub="/month" />
        <StatCard label="Median salary" value={`EUR ${data.summary.medianSalaryMin.toLocaleString()}`} sub="/month" />
      </div>

      {/* Premium breakdowns */}
      {data.byCity ? (
        <>
          <BarSection title="Average Salary by City" items={data.byCity.map((c) => ({ label: c.city, value: c.avg, count: c.count }))} maxValue={Math.max(...data.byCity.map((c) => c.avg))} />
          <BarSection title="Average Salary by Job Type" items={(data.byJobType || []).map((t) => ({ label: JOB_TYPE_LABELS[t.type] || t.type, value: t.avg, count: t.count }))} maxValue={Math.max(...(data.byJobType || []).map((t) => t.avg), 1)} />
          <BarSection title="Average Salary by German Level" items={(data.byGermanLevel || []).map((l) => ({ label: l.level, value: l.avg, count: l.count }))} maxValue={Math.max(...(data.byGermanLevel || []).map((l) => l.avg), 1)} />
        </>
      ) : (
        <PremiumGate feature="Full salary breakdown">
          <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-xl p-8 text-center">
            <p className="text-gray-400 mb-2">Unlock detailed salary breakdowns by city, job type, and German level</p>
            <p className="text-primary font-semibold text-sm">Upgrade to Premium</p>
          </div>
        </PremiumGate>
      )}
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-white">
        {value}
        {sub && <span className="text-sm text-gray-500 font-normal">{sub}</span>}
      </p>
    </div>
  )
}

function BarSection({ title, items, maxValue }: { title: string; items: { label: string; value: number; count: number }[]; maxValue: number }) {
  return (
    <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-300">{item.label}</span>
              <span className="text-emerald-400 font-medium">EUR {item.value.toLocaleString()}/mo</span>
            </div>
            <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-600 mt-0.5">{item.count} jobs</p>
          </div>
        ))}
      </div>
    </div>
  )
}
