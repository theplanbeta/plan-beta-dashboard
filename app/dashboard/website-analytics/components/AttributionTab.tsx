"use client"

import { TabSkeleton } from "./SkeletonLoader"
import { ErrorBanner } from "./ServiceBanner"
import MetricCard from "./MetricCard"
import BarChart from "@/components/charts/BarChart"

type FirstPartyData = {
  utmBreakdown?: Array<{ source: string; leads: number; conversions: number; conversionRate: number }>
  campaigns?: Array<{ campaign: string; leads: number; conversions: number; conversionRate: number }>
  linkClicks?: {
    totalClicks: number
    uniqueVisitors: number
    topLinks: Array<{ slug: string; clicks: number; destination: string }>
  }
  contentPerformance?: Array<{
    id: string
    title: string
    platform: string
    views: number
    engagementRate: number
    leadsGenerated: number
    roi: number
  }>
}

type Props = {
  data: unknown
  loading: boolean
  error: string | null
}

export default function AttributionTab({ data, loading, error }: Props) {
  if (loading) return <TabSkeleton />
  if (error) return <ErrorBanner message={error} />

  const fp = data as FirstPartyData | null
  if (!fp) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No attribution data available yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Link Click Stats */}
      {fp.linkClicks && (
        <div className="grid grid-cols-2 gap-4">
          <MetricCard label="Total Link Clicks" value={fp.linkClicks.totalClicks.toLocaleString()} color="text-blue-600 dark:text-blue-400" />
          <MetricCard label="Unique Visitors" value={fp.linkClicks.uniqueVisitors.toLocaleString()} />
        </div>
      )}

      {/* UTM Source Breakdown */}
      {fp.utmBreakdown && fp.utmBreakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Leads by UTM Source</h2>
          <BarChart
            data={fp.utmBreakdown.map((s) => ({
              label: s.source.replace(/_/g, " "),
              value: s.leads,
              color: "#8b5cf6",
            }))}
            height={200}
            valueSuffix=" leads"
          />
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Source</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Leads</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Converted</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Rate</th>
                </tr>
              </thead>
              <tbody>
                {fp.utmBreakdown.map((s) => (
                  <tr key={s.source} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-2 px-4 text-sm text-gray-900 dark:text-white font-medium">{s.source.replace(/_/g, " ")}</td>
                    <td className="py-2 px-4 text-sm text-gray-600 dark:text-gray-300 text-right">{s.leads}</td>
                    <td className="py-2 px-4 text-sm text-purple-600 dark:text-purple-400 text-right font-medium">{s.conversions}</td>
                    <td className="py-2 px-4 text-sm text-right">
                      <span className={s.conversionRate >= 20 ? "text-green-600 dark:text-green-400" : s.conversionRate >= 10 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}>
                        {s.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Campaign Breakdown */}
      {fp.campaigns && fp.campaigns.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Campaign Performance</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Campaign</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Leads</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Converted</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Rate</th>
                </tr>
              </thead>
              <tbody>
                {fp.campaigns.map((c) => (
                  <tr key={c.campaign} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-2 px-4 text-sm text-gray-900 dark:text-white font-medium max-w-xs truncate">{c.campaign}</td>
                    <td className="py-2 px-4 text-sm text-gray-600 dark:text-gray-300 text-right">{c.leads}</td>
                    <td className="py-2 px-4 text-sm text-purple-600 dark:text-purple-400 text-right font-medium">{c.conversions}</td>
                    <td className="py-2 px-4 text-sm text-right">
                      <span className={c.conversionRate >= 20 ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}>
                        {c.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Links */}
      {fp.linkClicks?.topLinks && fp.linkClicks.topLinks.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Tracked Links</h2>
          <div className="space-y-2">
            {fp.linkClicks.topLinks.map((link, i) => (
              <div key={link.slug} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                <div className="flex-1 min-w-0">
                  <span className="text-gray-400 text-sm mr-2">{i + 1}.</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">/go/{link.slug}</span>
                  <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{link.destination}</div>
                </div>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 ml-4">{link.clicks.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Performance */}
      {fp.contentPerformance && fp.contentPerformance.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content Performance</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Content</th>
                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Platform</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Views</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Leads</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">ROI</th>
                </tr>
              </thead>
              <tbody>
                {fp.contentPerformance.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-2 px-4 text-sm text-gray-900 dark:text-white font-medium max-w-xs truncate">{c.title || "Untitled"}</td>
                    <td className="py-2 px-4 text-sm text-gray-500 dark:text-gray-400">{c.platform}</td>
                    <td className="py-2 px-4 text-sm text-gray-600 dark:text-gray-300 text-right">{c.views.toLocaleString()}</td>
                    <td className="py-2 px-4 text-sm text-purple-600 dark:text-purple-400 text-right font-medium">{c.leadsGenerated}</td>
                    <td className="py-2 px-4 text-sm text-right">
                      <span className={c.roi > 0 ? "text-green-600 dark:text-green-400" : "text-gray-500"}>
                        {c.roi > 0 ? `${c.roi.toFixed(0)}%` : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
