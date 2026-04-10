"use client"

import { useState, useEffect, useCallback } from "react"
import PeriodSelector from "@/components/charts/PeriodSelector"
import OverviewTab from "./components/OverviewTab"
import SearchTab from "./components/SearchTab"
import PerformanceTab from "./components/PerformanceTab"
import AttributionTab from "./components/AttributionTab"
import InsightsTab from "./components/InsightsTab"
import VisitorInsightsTab from "./components/VisitorInsightsTab"
import RealtimeBadge from "./components/RealtimeBadge"

const TABS = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "search", label: "Search", icon: "🔍" },
  { id: "performance", label: "Performance", icon: "⚡" },
  { id: "attribution", label: "Attribution", icon: "🎯" },
  { id: "insights", label: "Insights", icon: "🧠" },
  { id: "visitors", label: "Visitors", icon: "👁️" },
] as const

type TabId = (typeof TABS)[number]["id"]

type TabData = Record<string, { data: unknown; loading: boolean; error: string | null }>

export default function WebsiteAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const [period, setPeriod] = useState(30)
  const [tabData, setTabData] = useState<TabData>({})
  const [refreshing, setRefreshing] = useState(false)

  const fetchTabData = useCallback(
    async (tab: TabId, force = false) => {
      if (tabData[`${tab}-${period}`]?.data && !force) return

      const key = `${tab}-${period}`
      setTabData((prev) => ({ ...prev, [key]: { data: null, loading: true, error: null } }))

      const endpoints: Record<TabId, string> = {
        overview: `/api/analytics/website/ga4?period=${period}`,
        search: `/api/analytics/website/gsc?period=${period}`,
        performance: `/api/analytics/website/vercel?period=${period}`,
        attribution: `/api/analytics/website/first-party?period=${period}`,
        insights: `/api/analytics/marketing-insights`,
        visitors: `/api/analytics/website/visitor-insights?period=${period}`,
      }

      try {
        const res = await fetch(endpoints[tab])
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setTabData((prev) => ({ ...prev, [key]: { data, loading: false, error: null } }))
      } catch (err) {
        setTabData((prev) => ({
          ...prev,
          [key]: { data: null, loading: false, error: (err as Error).message },
        }))
      }
    },
    [period, tabData]
  )

  useEffect(() => {
    fetchTabData(activeTab)
  }, [activeTab, period]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetch("/api/analytics/website/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "all" }),
      })
      // Clear all cached tab data and re-fetch current tab
      setTabData({})
      await fetchTabData(activeTab, true)
    } catch {
      // ignore
    } finally {
      setRefreshing(false)
    }
  }

  const currentKey = `${activeTab}-${period}`
  const current = tabData[currentKey] || { data: null, loading: true, error: null }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Website Analytics</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Unified analytics from GA4, Search Console, Vercel &amp; more
            </p>
          </div>
          <RealtimeBadge />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-1.5 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <PeriodSelector value={period} onChange={(days) => setPeriod(days || 365)} />

      {/* Tab Bar */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary dark:text-red-400 dark:border-red-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300"
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab data={current.data} loading={current.loading} error={current.error} />}
      {activeTab === "search" && <SearchTab data={current.data} loading={current.loading} error={current.error} />}
      {activeTab === "performance" && (
        <PerformanceTab data={current.data} loading={current.loading} error={current.error} />
      )}
      {activeTab === "attribution" && (
        <AttributionTab data={current.data} loading={current.loading} error={current.error} />
      )}
      {activeTab === "insights" && (
        <InsightsTab data={current.data} loading={current.loading} error={current.error} />
      )}
      {activeTab === "visitors" && (
        <VisitorInsightsTab data={current.data} loading={current.loading} error={current.error} />
      )}
    </div>
  )
}
