"use client"

import { TabSkeleton } from "./SkeletonLoader"
import { NotConfiguredBanner, ErrorBanner } from "./ServiceBanner"
import MetricCard from "./MetricCard"
import BarChart from "@/components/charts/BarChart"
import DonutChart from "@/components/charts/DonutChart"

type GA4Data = {
  configured: boolean
  overview?: {
    sessions: number
    users: number
    pageviews: number
    bounceRate: number
    avgSessionDuration: number
    newUsers: number
  }
  sourceMedium?: Array<{ source: string; medium: string; sessions: number; users: number; bounceRate: number }>
  topPages?: Array<{ pagePath: string; pageviews: number; avgDuration: number; bounceRate: number }>
  countries?: Array<{ country: string; users: number; sessions: number }>
  devices?: Array<{ deviceCategory: string; users: number; sessions: number }>
  landingPages?: Array<{ landingPage: string; sessions: number; users: number; bounceRate: number }>
}

type Props = {
  data: unknown
  loading: boolean
  error: string | null
}

export default function OverviewTab({ data, loading, error }: Props) {
  if (loading) return <TabSkeleton />
  if (error) return <ErrorBanner message={error} />

  const ga4 = data as GA4Data | null
  if (!ga4?.configured) {
    return (
      <NotConfiguredBanner
        service="Google Analytics 4"
        message="Add GA4_PROPERTY_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY to enable traffic analytics."
      />
    )
  }

  const ov = ga4.overview

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {ov && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard label="Sessions" value={ov.sessions.toLocaleString()} />
          <MetricCard label="Users" value={ov.users.toLocaleString()} />
          <MetricCard label="Pageviews" value={ov.pageviews.toLocaleString()} />
          <MetricCard
            label="Bounce Rate"
            value={`${(ov.bounceRate * 100).toFixed(1)}%`}
            color={ov.bounceRate > 0.7 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}
          />
          <MetricCard label="Avg Duration" value={`${Math.round(ov.avgSessionDuration)}s`} />
          <MetricCard label="New Users" value={ov.newUsers.toLocaleString()} />
        </div>
      )}

      {/* Source/Medium + Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        {ga4.sourceMedium && ga4.sourceMedium.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Traffic Sources</h2>
            <BarChart
              data={ga4.sourceMedium.slice(0, 10).map((s) => ({
                label: `${s.source} / ${s.medium}`,
                value: s.sessions,
                color: "#3b82f6",
              }))}
              height={250}
              valueSuffix=" sessions"
            />
          </div>
        )}

        {/* Device Breakdown */}
        {ga4.devices && ga4.devices.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Devices</h2>
            <DonutChart
              data={ga4.devices.map((d) => {
                const colorMap: Record<string, string> = {
                  desktop: "#3b82f6",
                  mobile: "#10b981",
                  tablet: "#f59e0b",
                }
                return {
                  label: d.deviceCategory.charAt(0).toUpperCase() + d.deviceCategory.slice(1),
                  value: d.users,
                  color: colorMap[d.deviceCategory] || "#6b7280",
                }
              })}
            />
          </div>
        )}
      </div>

      {/* Top Pages */}
      {ga4.topPages && ga4.topPages.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Pages</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Page</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Views</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Avg Duration</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Bounce Rate</th>
                </tr>
              </thead>
              <tbody>
                {ga4.topPages.map((page) => (
                  <tr key={page.pagePath} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium max-w-xs truncate" title={page.pagePath}>
                      {page.pagePath}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white text-right">{page.pageviews.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 text-right">{Math.round(page.avgDuration)}s</td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={page.bounceRate > 0.7 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                        {(page.bounceRate * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Countries */}
      {ga4.countries && ga4.countries.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Countries</h2>
          <BarChart
            data={ga4.countries.slice(0, 10).map((c) => ({
              label: c.country,
              value: c.users,
              color: "#8b5cf6",
            }))}
            height={200}
            valueSuffix=" users"
          />
        </div>
      )}

      {/* Landing Pages */}
      {ga4.landingPages && ga4.landingPages.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Landing Pages</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Landing Page</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Sessions</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Users</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Bounce</th>
                </tr>
              </thead>
              <tbody>
                {ga4.landingPages.map((lp) => (
                  <tr key={lp.landingPage} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium max-w-xs truncate" title={lp.landingPage}>
                      {lp.landingPage}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white text-right">{lp.sessions.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 text-right">{lp.users.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={lp.bounceRate > 0.7 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                        {(lp.bounceRate * 100).toFixed(1)}%
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
