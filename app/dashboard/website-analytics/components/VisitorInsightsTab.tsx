"use client"

import { TabSkeleton } from "./SkeletonLoader"
import { ErrorBanner } from "./ServiceBanner"
import MetricCard from "./MetricCard"
import LineChart from "@/components/charts/LineChart"
import ConversionFunnel from "./ConversionFunnel"
import LeadJourneyViewer from "./LeadJourneyViewer"

type VisitorInsightsData = {
  totalPageViews: number
  uniqueVisitors: number
  avgPagesPerSession: number
  avgDurationPerPage: number | null
  durationSampleSize: number
  dailyPageViews: Array<{ date: string; count: number }>
  funnel: {
    totalVisitors: number
    returningVisitors: number
    convertedVisitors: number
    visitToReturnRate: number
    returnToConvertRate: number
    visitToConvertRate: number
  }
  topPages: Array<{
    path: string
    pageviews: number
    avgDuration: number | null
    avgScrollDepth: number | null
  }>
  topConversionPaths: Array<{ path: string; conversions: number }>
  leadJourneys: Array<{
    leadId: string
    leadName: string
    leadSource: string
    convertedAt: string
    pages: Array<{
      path: string
      duration: number | null
      scrollDepth: number | null
      timestamp: string
    }>
  }>
}

type Props = {
  data: unknown
  loading: boolean
  error: string | null
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function scrollDepthColor(depth: number | null): string {
  if (depth === null) return "text-gray-400"
  if (depth >= 70) return "text-green-600 dark:text-green-400"
  if (depth >= 40) return "text-amber-500 dark:text-amber-400"
  return "text-red-500 dark:text-red-400"
}

export default function VisitorInsightsTab({ data, loading, error }: Props) {
  if (loading) return <TabSkeleton />
  if (error) return <ErrorBanner message={error} />

  const d = data as VisitorInsightsData | null
  if (!d) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No visitor data available yet.</p>
      </div>
    )
  }

  // Empty state for fresh deploy
  if (d.totalPageViews < 5) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total Pageviews" value={d.totalPageViews} />
          <MetricCard label="Unique Visitors" value={d.uniqueVisitors} />
          <MetricCard label="Avg Pages/Session" value={d.avgPagesPerSession} />
          <MetricCard
            label="Avg Duration/Page"
            value={d.avgDurationPerPage !== null ? formatDuration(d.avgDurationPerPage) : "—"}
            subtitle="Insufficient data"
          />
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Visitor tracking just started. Data will appear here as visitors browse the site.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Pageviews" value={d.totalPageViews.toLocaleString()} color="text-blue-600 dark:text-blue-400" />
        <MetricCard label="Unique Visitors" value={d.uniqueVisitors.toLocaleString()} />
        <MetricCard label="Avg Pages/Session" value={d.avgPagesPerSession} />
        <MetricCard
          label="Avg Duration/Page"
          value={d.avgDurationPerPage !== null ? formatDuration(d.avgDurationPerPage) : "—"}
          subtitle={d.avgDurationPerPage !== null ? `Based on ${d.durationSampleSize} pages` : "Insufficient data (<10 samples)"}
        />
      </div>

      {/* Daily Pageview Sparkline */}
      {d.dailyPageViews.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Daily Pageviews (Last 7 Days)</h3>
          <LineChart
            data={d.dailyPageViews.map((dp) => ({ date: dp.date, value: dp.count }))}
            color="#3b82f6"
            height={120}
          />
        </div>
      )}

      {/* Funnel + Content Effectiveness */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <ConversionFunnel data={d.funnel} />

        {/* Content Effectiveness Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content Effectiveness</h3>
          {d.topPages.length === 0 ? (
            <p className="text-sm text-gray-400">No page data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="pb-2 font-medium">Page</th>
                    <th className="pb-2 font-medium text-right">Views</th>
                    <th className="pb-2 font-medium text-right">Avg Time</th>
                    <th className="pb-2 font-medium text-right">Scroll</th>
                  </tr>
                </thead>
                <tbody>
                  {d.topPages.map((page) => (
                    <tr key={page.path} className="border-b border-gray-50 dark:border-gray-700/50">
                      <td className="py-2 text-gray-900 dark:text-white truncate max-w-[200px]" title={page.path}>
                        {page.path}
                      </td>
                      <td className="py-2 text-right text-gray-600 dark:text-gray-300">
                        {page.pageviews}
                      </td>
                      <td className="py-2 text-right text-gray-600 dark:text-gray-300">
                        {page.avgDuration !== null ? formatDuration(page.avgDuration) : "—"}
                      </td>
                      <td className={`py-2 text-right font-medium ${scrollDepthColor(page.avgScrollDepth)}`}>
                        {page.avgScrollDepth !== null ? `${page.avgScrollDepth}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Top Conversion Paths */}
      {d.topConversionPaths.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Last Page Before Conversion</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-2 font-medium">Page</th>
                  <th className="pb-2 font-medium text-right">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {d.topConversionPaths.map((cp) => (
                  <tr key={cp.path} className="border-b border-gray-50 dark:border-gray-700/50">
                    <td className="py-2 text-gray-900 dark:text-white">{cp.path}</td>
                    <td className="py-2 text-right text-green-600 dark:text-green-400 font-medium">{cp.conversions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lead Journey Viewer */}
      <LeadJourneyViewer journeys={d.leadJourneys} />
    </div>
  )
}
