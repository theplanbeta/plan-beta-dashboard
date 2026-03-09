"use client"

import { useState } from "react"
import { TabSkeleton } from "./SkeletonLoader"
import { NotConfiguredBanner, ErrorBanner } from "./ServiceBanner"
import MetricCard from "./MetricCard"

type GSCData = {
  configured: boolean
  overview?: { impressions: number; clicks: number; ctr: number; position: number }
  topQueries?: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>
  topPages?: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>
  devices?: Array<{ device: string; clicks: number; impressions: number; ctr: number; position: number }>
}

type SortKey = "clicks" | "impressions" | "ctr" | "position"
type SortDir = "asc" | "desc"

type Props = {
  data: unknown
  loading: boolean
  error: string | null
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
}: {
  label: string
  sortKey: SortKey
  currentSort: SortKey
  currentDir: SortDir
  onSort: (key: SortKey) => void
}) {
  return (
    <th
      className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-white select-none"
      onClick={() => onSort(sortKey)}
    >
      {label} {currentSort === sortKey ? (currentDir === "desc" ? "↓" : "↑") : ""}
    </th>
  )
}

export default function SearchTab({ data, loading, error }: Props) {
  const [querySort, setQuerySort] = useState<SortKey>("clicks")
  const [queryDir, setQueryDir] = useState<SortDir>("desc")
  const [pageSort, setPageSort] = useState<SortKey>("clicks")
  const [pageDir, setPageDir] = useState<SortDir>("desc")

  if (loading) return <TabSkeleton />
  if (error) return <ErrorBanner message={error} />

  const gsc = data as GSCData | null
  if (!gsc?.configured) {
    return (
      <NotConfiguredBanner
        service="Google Search Console"
        message="Add GSC_SITE_URL and Google service account credentials to enable search performance data."
      />
    )
  }

  const ov = gsc.overview

  const handleQuerySort = (key: SortKey) => {
    if (querySort === key) setQueryDir((d) => (d === "desc" ? "asc" : "desc"))
    else {
      setQuerySort(key)
      setQueryDir("desc")
    }
  }

  const handlePageSort = (key: SortKey) => {
    if (pageSort === key) setPageDir((d) => (d === "desc" ? "asc" : "desc"))
    else {
      setPageSort(key)
      setPageDir("desc")
    }
  }

  const sortedQueries = [...(gsc.topQueries || [])].sort((a, b) => {
    const mul = queryDir === "desc" ? -1 : 1
    return (a[querySort] - b[querySort]) * mul
  })

  const sortedPages = [...(gsc.topPages || [])].sort((a, b) => {
    const mul = pageDir === "desc" ? -1 : 1
    return (a[pageSort] - b[pageSort]) * mul
  })

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {ov && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total Impressions" value={ov.impressions.toLocaleString()} />
          <MetricCard label="Total Clicks" value={ov.clicks.toLocaleString()} color="text-blue-600 dark:text-blue-400" />
          <MetricCard label="Avg CTR" value={`${(ov.ctr * 100).toFixed(2)}%`} color="text-purple-600 dark:text-purple-400" />
          <MetricCard
            label="Avg Position"
            value={ov.position.toFixed(1)}
            color={ov.position <= 10 ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}
            subtitle="Lower is better"
          />
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Search Console data is delayed by 2-3 days
      </p>

      {/* Top Queries */}
      {sortedQueries.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Search Queries</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Query</th>
                  <SortableHeader label="Clicks" sortKey="clicks" currentSort={querySort} currentDir={queryDir} onSort={handleQuerySort} />
                  <SortableHeader label="Impressions" sortKey="impressions" currentSort={querySort} currentDir={queryDir} onSort={handleQuerySort} />
                  <SortableHeader label="CTR" sortKey="ctr" currentSort={querySort} currentDir={queryDir} onSort={handleQuerySort} />
                  <SortableHeader label="Position" sortKey="position" currentSort={querySort} currentDir={queryDir} onSort={handleQuerySort} />
                </tr>
              </thead>
              <tbody>
                {sortedQueries.map((q) => (
                  <tr key={q.query} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium max-w-xs truncate">{q.query}</td>
                    <td className="py-3 px-4 text-sm text-blue-600 dark:text-blue-400 text-right font-medium">{q.clicks.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 text-right">{q.impressions.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-purple-600 dark:text-purple-400 text-right">{(q.ctr * 100).toFixed(2)}%</td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={q.position <= 10 ? "text-green-600 dark:text-green-400" : q.position <= 20 ? "text-yellow-600 dark:text-yellow-400" : "text-gray-600 dark:text-gray-400"}>
                        {q.position.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Pages */}
      {sortedPages.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Pages in Search</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Page</th>
                  <SortableHeader label="Clicks" sortKey="clicks" currentSort={pageSort} currentDir={pageDir} onSort={handlePageSort} />
                  <SortableHeader label="Impressions" sortKey="impressions" currentSort={pageSort} currentDir={pageDir} onSort={handlePageSort} />
                  <SortableHeader label="CTR" sortKey="ctr" currentSort={pageSort} currentDir={pageDir} onSort={handlePageSort} />
                  <SortableHeader label="Position" sortKey="position" currentSort={pageSort} currentDir={pageDir} onSort={handlePageSort} />
                </tr>
              </thead>
              <tbody>
                {sortedPages.map((p) => {
                  const shortPath = p.page.replace(/^https?:\/\/[^/]+/, "") || p.page
                  return (
                    <tr key={p.page} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium max-w-xs truncate" title={p.page}>
                        {shortPath}
                      </td>
                      <td className="py-3 px-4 text-sm text-blue-600 dark:text-blue-400 text-right font-medium">{p.clicks.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 text-right">{p.impressions.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-purple-600 dark:text-purple-400 text-right">{(p.ctr * 100).toFixed(2)}%</td>
                      <td className="py-3 px-4 text-sm text-right">
                        <span className={p.position <= 10 ? "text-green-600 dark:text-green-400" : p.position <= 20 ? "text-yellow-600 dark:text-yellow-400" : "text-gray-600 dark:text-gray-400"}>
                          {p.position.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Devices */}
      {gsc.devices && gsc.devices.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Search by Device</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {gsc.devices.map((d) => (
              <div key={d.device} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white capitalize">{d.device}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Clicks</div>
                    <div className="font-semibold text-blue-600 dark:text-blue-400">{d.clicks.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">CTR</div>
                    <div className="font-semibold text-purple-600 dark:text-purple-400">{(d.ctr * 100).toFixed(2)}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
