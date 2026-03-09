"use client"

import { useState, useEffect } from "react"
import { TabSkeleton } from "./SkeletonLoader"
import { NotConfiguredBanner, ErrorBanner } from "./ServiceBanner"
import MetricCard from "./MetricCard"

type VercelData = {
  configured: boolean
  webAnalytics?: { pageviews: number; visitors: number; bounceRate?: number; visitDuration?: number }
  topPages?: Array<{ page: string; views: number }>
  topReferrers?: Array<{ referrer: string; views: number }>
  countries?: Array<{ country: string; views: number }>
  webVitals?: { lcp: number | null; inp: number | null; cls: number | null; fcp: number | null; ttfb: number | null }
}

type ClarityData = {
  configured: boolean
  dashboardUrl: string | null
}

type Props = {
  data: unknown
  loading: boolean
  error: string | null
}

function VitalCard({ label, value, unit, thresholds }: { label: string; value: number | null; unit: string; thresholds: [number, number] }) {
  if (value === null) return null
  const color =
    value <= thresholds[0]
      ? "text-green-600 dark:text-green-400"
      : value <= thresholds[1]
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400"
  const bg =
    value <= thresholds[0]
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      : value <= thresholds[1]
        ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
        : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"

  return (
    <div className={`rounded-lg border p-5 ${bg}`}>
      <div className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</div>
      <div className={`mt-1.5 text-2xl font-bold ${color}`}>
        {unit === "s" ? (value / 1000).toFixed(2) : value.toFixed(3)}{unit === "s" ? "s" : ""}
      </div>
      <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">p75 value</div>
    </div>
  )
}

export default function PerformanceTab({ data, loading, error }: Props) {
  const [clarityData, setClarityData] = useState<ClarityData | null>(null)

  useEffect(() => {
    fetch("/api/analytics/website/clarity")
      .then((r) => r.json())
      .then((d) => setClarityData(d))
      .catch(() => {})
  }, [])

  if (loading) return <TabSkeleton />
  if (error) return <ErrorBanner message={error} />

  const vercel = data as VercelData | null
  if (!vercel?.configured) {
    return (
      <NotConfiguredBanner
        service="Vercel Analytics"
        message="Add VERCEL_API_TOKEN to enable performance analytics and Core Web Vitals."
      />
    )
  }

  const wa = vercel.webAnalytics
  const vitals = vercel.webVitals

  return (
    <div className="space-y-6">
      {/* Core Web Vitals */}
      {vitals && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Core Web Vitals</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <VitalCard label="LCP" value={vitals.lcp} unit="s" thresholds={[2500, 4000]} />
            <VitalCard label="INP" value={vitals.inp} unit="ms" thresholds={[200, 500]} />
            <VitalCard label="CLS" value={vitals.cls} unit="" thresholds={[0.1, 0.25]} />
            <VitalCard label="FCP" value={vitals.fcp} unit="s" thresholds={[1800, 3000]} />
            <VitalCard label="TTFB" value={vitals.ttfb} unit="s" thresholds={[800, 1800]} />
          </div>
        </div>
      )}

      {/* Vercel Web Analytics */}
      {wa && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Pageviews" value={wa.pageviews?.toLocaleString() ?? "—"} />
          <MetricCard label="Visitors" value={wa.visitors?.toLocaleString() ?? "—"} color="text-blue-600 dark:text-blue-400" />
          {wa.bounceRate != null && (
            <MetricCard label="Bounce Rate" value={`${(wa.bounceRate * 100).toFixed(1)}%`} />
          )}
          {wa.visitDuration != null && (
            <MetricCard label="Avg Visit" value={`${Math.round(wa.visitDuration)}s`} />
          )}
        </div>
      )}

      {/* Top Pages + Top Referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {vercel.topPages && vercel.topPages.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Pages (Vercel)</h2>
            <div className="space-y-2">
              {vercel.topPages.slice(0, 15).map((p, i) => (
                <div key={p.page} className="flex justify-between items-center py-1.5">
                  <span className="text-sm text-gray-900 dark:text-white truncate max-w-[70%]" title={p.page}>
                    <span className="text-gray-400 mr-2">{i + 1}.</span>
                    {p.page}
                  </span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{p.views.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {vercel.topReferrers && vercel.topReferrers.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Referrers</h2>
            <div className="space-y-2">
              {vercel.topReferrers.slice(0, 15).map((r, i) => (
                <div key={r.referrer} className="flex justify-between items-center py-1.5">
                  <span className="text-sm text-gray-900 dark:text-white truncate max-w-[70%]">
                    <span className="text-gray-400 mr-2">{i + 1}.</span>
                    {r.referrer || "(direct)"}
                  </span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{r.views.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Clarity */}
      {clarityData?.configured && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Microsoft Clarity</h2>
            {clarityData.dashboardUrl && (
              <a
                href={clarityData.dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Open full dashboard →
              </a>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View session recordings, heatmaps, rage clicks, and dead click analysis in the Clarity dashboard.
          </p>
        </div>
      )}
    </div>
  )
}
