"use client"

import { useEffect, useState } from "react"
import { formatCurrency } from "@/lib/utils"

interface InsightsData {
  revenue: { projected: number }
  students: { active: number }
  profitability: { netMargin: number }
  payments: { collectionEfficiency: number }
  churn: { rate: number }
  attendance: { avgRate: number }
  forecasts: { projectedNetProfit: number }
  kpis: { capacityUtilization: number }
}

interface MetricConfig {
  label: string
  getValue: (data: InsightsData) => number
  format: (value: number) => string
  inverted: boolean
  thresholdBad: number
  thresholdDirection: "above" | "below"
}

const METRICS: MetricConfig[] = [
  {
    label: "MRR",
    getValue: (d) => d.revenue.projected,
    format: (v) => formatCurrency(v, "EUR"),
    inverted: false,
    thresholdBad: 0,
    thresholdDirection: "below",
  },
  {
    label: "Active Students",
    getValue: (d) => d.students.active,
    format: (v) => v.toLocaleString(),
    inverted: false,
    thresholdBad: 5,
    thresholdDirection: "below",
  },
  {
    label: "Net Profit Margin",
    getValue: (d) => d.profitability.netMargin,
    format: (v) => `${v.toFixed(1)}%`,
    inverted: false,
    thresholdBad: 10,
    thresholdDirection: "below",
  },
  {
    label: "Collection Rate",
    getValue: (d) => d.payments.collectionEfficiency,
    format: (v) => `${v.toFixed(1)}%`,
    inverted: false,
    thresholdBad: 70,
    thresholdDirection: "below",
  },
  {
    label: "Churn Rate",
    getValue: (d) => d.churn.rate,
    format: (v) => `${v.toFixed(1)}%`,
    inverted: true,
    thresholdBad: 10,
    thresholdDirection: "above",
  },
  {
    label: "Avg Attendance",
    getValue: (d) => d.attendance.avgRate,
    format: (v) => `${v.toFixed(1)}%`,
    inverted: false,
    thresholdBad: 75,
    thresholdDirection: "below",
  },
  {
    label: "Pipeline Value",
    getValue: (d) => d.forecasts.projectedNetProfit,
    format: (v) => formatCurrency(v, "EUR"),
    inverted: false,
    thresholdBad: 0,
    thresholdDirection: "below",
  },
  {
    label: "Capacity Utilization",
    getValue: (d) => d.kpis.capacityUtilization,
    format: (v) => `${v.toFixed(1)}%`,
    inverted: false,
    thresholdBad: 50,
    thresholdDirection: "below",
  },
]

function isMetricHealthy(value: number, metric: MetricConfig): boolean {
  if (metric.thresholdDirection === "above") {
    return value <= metric.thresholdBad
  }
  return value >= metric.thresholdBad
}

function LoadingSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse space-y-2 p-3">
            <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ExecutiveSummary() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch("/api/analytics/insights?period=30")
        if (!res.ok) {
          throw new Error(`Failed to fetch insights: ${res.status}`)
        }
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
  }, [])

  if (loading) {
    return <LoadingSkeleton />
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-sm text-red-600 dark:text-red-400">
          {error || "Unable to load executive summary."}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
        Executive Summary — Last 30 Days
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((metric) => {
          const value = metric.getValue(data)
          const healthy = isMetricHealthy(value, metric)

          // For inverted metrics (churn): healthy means low, so arrow should point down (good)
          // For normal metrics: healthy means high, so arrow should point up (good)
          const arrowUp = metric.inverted ? !healthy : healthy

          const colorClass = healthy
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400"

          return (
            <div key={metric.label} className="p-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {metric.label}
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {metric.format(value)}
                </span>
                <span className={`text-sm font-medium ${colorClass}`}>
                  {arrowUp ? "\u2191" : "\u2193"}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
