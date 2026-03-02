"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import BarChart from "@/components/charts/BarChart"
import LineChart from "@/components/charts/LineChart"
import DonutChart from "@/components/charts/DonutChart"
import PeriodSelector from "@/components/charts/PeriodSelector"
import AIInsights from "@/components/ai/AIInsights"

type MarketingData = {
  period: number
  overview: {
    totalLeads: number
    convertedLeads: number
    overallConversionRate: number
    recentLeadsCount: number
    recentConversions: number
    recentConversionRate: number
  }
  leads: {
    byStatus: Record<string, number>
    byQuality: Record<string, number>
    bySource: Record<string, {
      total: number
      converted: number
      conversionRate: number
      quality: Record<string, number>
    }>
    daily: Array<{ date: string; count: number }>
  }
  students: {
    bySource: Record<string, {
      total: number
      recent: number
      revenue: number
      avgValue: number
    }>
    recentEnrollments: number
  }
  trials: {
    scheduled: number
    attended: number
    converted: number
    attendanceRate: number
    conversionRate: number
  }
  funnel: {
    data: {
      leads: number
      contacted: number
      trialScheduled: number
      trialAttended: number
      converted: number
    }
    rates: {
      leadToContact: number
      contactToTrial: number
      trialToAttendance: number
      attendanceToConversion: number
      overallConversion: number
    }
  }
  interest: {
    byLevel: Record<string, number>
  }
  conversions: {
    total: number
    recent: number
    daily: Array<{ date: string; count: number }>
    avgTimeToConversion: number
  }
  kpis: {
    leadGrowth: number
    conversionRate: number
    avgTimeToConversion: number
    trialAttendanceRate: number
    trialConversionRate: number
    topSource: string
    bestPerformingSource: string
  }
  recommendations: Array<{
    type: string
    title: string
    message: string
    action: string
  }>
  attribution?: {
    campaigns: Array<{ campaign: string; leads: number; conversions: number; conversionRate: number }>
    landingPages: Array<{ page: string; leads: number; conversions: number; conversionRate: number }>
    devices: Array<{ deviceType: string; leads: number; conversions: number; conversionRate: number }>
  }
}

type LeadScoringData = {
  byRange: Array<{
    range: string
    leads: number
    conversions: number
    conversionRate: number
    avgDaysToConvert: number | null
  }>
  overall: {
    totalLeads: number
    totalConversions: number
    overallConversionRate: number
    avgScore: number | null
    scoredLeadsPercent: number
  }
}

type CACData = {
  byPlatform: Array<{
    platform: string
    spend: number
    leads: number
    conversions: number
    conversionRate: number
    cac: number | null
    cpc: number | null
    cpl: number | null
  }>
  overall: {
    totalSpend: number
    totalLeads: number
    totalConversions: number
    overallCAC: number | null
    avgLTV: number
    ltvCacRatio: number | null
  }
}

export default function MarketingDashboard({ userName }: { userName: string }) {
  const [data, setData] = useState<MarketingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("30")
  const [cacData, setCacData] = useState<CACData | null>(null)
  const [leadScoringData, setLeadScoringData] = useState<LeadScoringData | null>(null)

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [marketingRes, cacRes, lsRes] = await Promise.all([
        fetch(`/api/analytics/marketing?period=${period}`),
        fetch(`/api/analytics/cac?period=${period}`),
        fetch(`/api/analytics/lead-scoring`),
      ])
      const marketingData = await marketingRes.json()
      setData(marketingData)
      if (cacRes.ok) {
        const cacResult = await cacRes.json()
        setCacData(cacResult)
      }
      if (lsRes.ok) {
        const lsResult = await lsRes.json()
        setLeadScoringData(lsResult)
      }
    } catch (error) {
      console.error("Error fetching marketing data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getRecommendationColor = (type: string) => {
    const colors = {
      success: "bg-success/10 border-success text-success",
      warning: "bg-warning/10 border-warning text-warning",
      alert: "bg-error/10 border-error text-error",
      info: "bg-info/10 border-info text-info",
    }
    return colors[type as keyof typeof colors] || colors.info
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back, {userName}!</h1>
        <p className="text-gray-600 dark:text-gray-300">Loading your marketing metrics...</p>
      </div>
    )
  }

  // Prepare source comparison data
  const sourceComparison = Object.entries(data.students.bySource)
    .map(([source, stats]) => ({
      source: source.replace(/_/g, ' '),
      leads: data.leads.bySource[source]?.total || 0,
      conversions: data.leads.bySource[source]?.converted || 0,
      conversionRate: data.leads.bySource[source]?.conversionRate || 0,
      avgValue: stats.avgValue,
      revenue: stats.revenue,
    }))
    .sort((a, b) => b.avgValue - a.avgValue)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back, {userName}!</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Your marketing performance at a glance</p>
        </div>

        <PeriodSelector
          value={parseInt(period)}
          onChange={(days) => setPeriod(String(days || 365))}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Lead Growth</div>
          <div className="mt-2 text-3xl font-bold text-purple-600 dark:text-purple-400">
            {data.kpis.leadGrowth}
          </div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">new leads in period</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Conversion Rate</div>
          <div className={`mt-2 text-3xl font-bold ${data.kpis.conversionRate >= 20 ? "text-success" : "text-warning"}`}>
            {data.kpis.conversionRate.toFixed(1)}%
          </div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {data.overview.recentConversions} conversions
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Avg. Time to Close</div>
          <div className="mt-2 text-3xl font-bold text-info dark:text-blue-400">
            {data.kpis.avgTimeToConversion}d
          </div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">days to conversion</div>
        </div>
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="space-y-3">
          {data.recommendations.map((rec, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 ${getRecommendationColor(rec.type)}`}
            >
              <h3 className="font-semibold">{rec.title}</h3>
              <p className="text-sm mt-1 opacity-90">{rec.message}</p>
              <p className="text-sm mt-2 font-medium">→ {rec.action}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sales Funnel Visualization */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Complete Sales Funnel</h2>
        <div className="space-y-4">
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Total Leads</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{data.funnel.data.leads}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-8">
              <div className="bg-purple-500 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ width: '100%' }}>
                100%
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Contacted</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{data.funnel.data.contacted}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-8">
              <div className="bg-blue-500 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ width: `${data.funnel.rates.leadToContact}%` }}>
                {data.funnel.rates.leadToContact.toFixed(0)}%
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Trial Scheduled</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{data.funnel.data.trialScheduled}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-8">
              <div className="bg-cyan-500 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ width: `${(data.funnel.data.trialScheduled / data.funnel.data.leads) * 100}%` }}>
                {((data.funnel.data.trialScheduled / data.funnel.data.leads) * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Converted to Student</span>
              <span className="text-lg font-bold text-success">{data.funnel.data.converted}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-8">
              <div className="bg-success h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ width: `${data.funnel.rates.overallConversion}%` }}>
                {data.funnel.rates.overallConversion.toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Source Performance Comparison */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Source Performance - ROI Analysis
        </h2>
        <div className="space-y-4">
          {sourceComparison.map((source) => (
            <div key={source.source} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{source.source}</h3>
                <div className="text-right">
                  <div className="text-2xl font-bold text-success">{formatCurrency(source.avgValue)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">avg customer value</div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{source.leads}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Leads</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{source.conversions}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Converted</div>
                </div>
                <div>
                  <div className={`text-2xl font-bold ${source.conversionRate >= 20 ? 'text-success' : source.conversionRate >= 15 ? 'text-warning' : 'text-error'}`}>
                    {source.conversionRate.toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Conv. Rate</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-success">{formatCurrency(source.revenue)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total Revenue</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {data.kpis.bestPerformingSource && (
          <div className="mt-4 bg-success/10 border border-success rounded-lg p-4">
            <p className="text-sm text-success">
              💡 <strong>{data.kpis.bestPerformingSource.replace(/_/g, ' ')}</strong> brings the highest value students. Consider allocating more budget here.
            </p>
          </div>
        )}
      </div>

      {/* Campaign Performance */}
      {data.attribution?.campaigns && data.attribution.campaigns.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Campaign Performance</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Campaign Name</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Leads</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Conversions</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.attribution.campaigns.slice(0, 10).map((campaign) => (
                  <tr key={campaign.campaign} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium">{campaign.campaign}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white text-right">{campaign.leads}</td>
                    <td className="py-3 px-4 text-sm text-purple-600 dark:text-purple-400 text-right font-medium">{campaign.conversions}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={`font-medium ${campaign.conversionRate >= 20 ? 'text-success' : campaign.conversionRate >= 10 ? 'text-warning' : 'text-error'}`}>
                        {campaign.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : data.attribution ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Campaign Performance</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No campaign data</p>
        </div>
      ) : null}

      {/* Top Landing Pages */}
      {data.attribution?.landingPages && data.attribution.landingPages.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Landing Pages</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Page</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Leads</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Conversions</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.attribution.landingPages.map((lp) => {
                  const pathSegment = lp.page.split('/').filter(Boolean).pop() || lp.page
                  return (
                    <tr key={lp.page} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium" title={lp.page}>
                        /{pathSegment}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white text-right">{lp.leads}</td>
                      <td className="py-3 px-4 text-sm text-purple-600 dark:text-purple-400 text-right font-medium">{lp.conversions}</td>
                      <td className="py-3 px-4 text-sm text-right">
                        <span className={`font-medium ${lp.conversionRate >= 20 ? 'text-success' : lp.conversionRate >= 10 ? 'text-warning' : 'text-error'}`}>
                          {lp.conversionRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : data.attribution ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Landing Pages</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No landing page data</p>
        </div>
      ) : null}

      {/* Device Breakdown */}
      {data.attribution?.devices && data.attribution.devices.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Device Breakdown</h2>
          <div className="mb-6">
            <DonutChart
              data={data.attribution.devices.map((d) => {
                const colorMap: Record<string, string> = {
                  desktop: '#3b82f6',
                  mobile: '#10b981',
                  tablet: '#f59e0b',
                  unknown: '#6b7280',
                }
                return {
                  label: d.deviceType.charAt(0).toUpperCase() + d.deviceType.slice(1),
                  value: d.leads,
                  color: colorMap[d.deviceType.toLowerCase()] || '#6b7280',
                }
              })}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Device</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Leads</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Conversions</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.attribution.devices.map((d) => (
                  <tr key={d.deviceType} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium">
                      {d.deviceType.charAt(0).toUpperCase() + d.deviceType.slice(1)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white text-right">{d.leads}</td>
                    <td className="py-3 px-4 text-sm text-purple-600 dark:text-purple-400 text-right font-medium">{d.conversions}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={`font-medium ${d.conversionRate >= 20 ? 'text-success' : d.conversionRate >= 10 ? 'text-warning' : 'text-error'}`}>
                        {d.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : data.attribution ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Device Breakdown</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No device data</p>
        </div>
      ) : null}

      {/* Customer Acquisition Cost */}
      {cacData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Acquisition Cost (CAC)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Ad Spend</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(cacData.overall.totalSpend, 'EUR')}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Overall CAC</div>
              <div className="text-lg font-bold text-primary">{cacData.overall.overallCAC != null ? formatCurrency(cacData.overall.overallCAC, 'EUR') : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Avg LTV</div>
              <div className="text-lg font-bold text-success">{formatCurrency(cacData.overall.avgLTV, 'EUR')}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">LTV:CAC Ratio</div>
              <div className={`text-lg font-bold ${(cacData.overall.ltvCacRatio ?? 0) >= 3 ? "text-success" : "text-warning"}`}>
                {cacData.overall.ltvCacRatio != null ? `${cacData.overall.ltvCacRatio.toFixed(1)}x` : "—"}
              </div>
            </div>
          </div>
          {cacData.byPlatform.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">Platform</th>
                    <th className="text-right py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">Spend (EUR)</th>
                    <th className="text-right py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">Leads</th>
                    <th className="text-right py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">Conversions</th>
                    <th className="text-right py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">CAC</th>
                    <th className="text-right py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">CPL</th>
                  </tr>
                </thead>
                <tbody>
                  {cacData.byPlatform.map((p) => (
                    <tr key={p.platform} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-2 px-2 font-medium text-gray-900 dark:text-white">{p.platform.replace(/_/g, " ")}</td>
                      <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-300">{formatCurrency(p.spend, 'EUR')}</td>
                      <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-300">{p.leads}</td>
                      <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-300">{p.conversions}</td>
                      <td className="py-2 px-2 text-right font-medium text-primary">{p.cac != null ? formatCurrency(p.cac, 'EUR') : "—"}</td>
                      <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-300">{p.cpl != null ? formatCurrency(p.cpl, 'EUR') : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Lead Quality */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Lead Quality Distribution</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">🔥 HOT</span>
            <div className="flex items-center gap-3">
              <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-error h-3 rounded-full"
                  style={{ width: `${(data.leads.byQuality.HOT / (data.leads.byQuality.HOT + data.leads.byQuality.WARM + data.leads.byQuality.COLD)) * 100}%` }}
                />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white w-12 text-right">
                {data.leads.byQuality.HOT}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">🌡️ WARM</span>
            <div className="flex items-center gap-3">
              <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-warning h-3 rounded-full"
                  style={{ width: `${(data.leads.byQuality.WARM / (data.leads.byQuality.HOT + data.leads.byQuality.WARM + data.leads.byQuality.COLD)) * 100}%` }}
                />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white w-12 text-right">
                {data.leads.byQuality.WARM}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">❄️ COLD</span>
            <div className="flex items-center gap-3">
              <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-info h-3 rounded-full"
                  style={{ width: `${(data.leads.byQuality.COLD / (data.leads.byQuality.HOT + data.leads.byQuality.WARM + data.leads.byQuality.COLD)) * 100}%` }}
                />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white w-12 text-right">
                {data.leads.byQuality.COLD}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Lead Generation Trend</h2>
          <LineChart
            data={data.leads.daily.map((d) => ({ date: d.date, value: d.count }))}
            color="#8b5cf6"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Conversion Trend</h2>
          <LineChart
            data={data.conversions.daily.map((d) => ({ date: d.date, value: d.count }))}
            color="#10b981"
          />
        </div>
      </div>

      {/* Level Interest */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Course Interest Distribution</h2>
        <BarChart
          data={Object.entries(data.interest.byLevel)
            .filter(([, value]) => value > 0)
            .map(([label, value]) => ({
              label: label.replace(/_/g, ' '),
              value,
              color: "#3b82f6",
            }))}
        />
      </div>

      {/* Lead Score Effectiveness */}
      {leadScoringData && leadScoringData.byRange.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Lead Score Effectiveness</h2>
            {leadScoringData.overall.avgScore !== null && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Avg Score: {leadScoringData.overall.avgScore} · {leadScoringData.overall.scoredLeadsPercent.toFixed(0)}% scored
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <BarChart
                data={leadScoringData.byRange.map((r) => ({
                  label: r.range,
                  value: r.conversionRate,
                  color: r.range === "81-100" ? "#10b981" : r.range === "61-80" ? "#3b82f6" : r.range === "41-60" ? "#f59e0b" : "#ef4444",
                }))}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">Conversion Rate by Score Range (%)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 text-gray-600 dark:text-gray-300 font-medium">Range</th>
                    <th className="text-right py-2 text-gray-600 dark:text-gray-300 font-medium">Leads</th>
                    <th className="text-right py-2 text-gray-600 dark:text-gray-300 font-medium">Conv.</th>
                    <th className="text-right py-2 text-gray-600 dark:text-gray-300 font-medium">Rate</th>
                    <th className="text-right py-2 text-gray-600 dark:text-gray-300 font-medium">Avg Days</th>
                  </tr>
                </thead>
                <tbody>
                  {leadScoringData.byRange.map((r) => (
                    <tr key={r.range} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-2 text-gray-900 dark:text-white font-medium">{r.range}</td>
                      <td className="text-right py-2 text-gray-600 dark:text-gray-300">{r.leads}</td>
                      <td className="text-right py-2 text-gray-600 dark:text-gray-300">{r.conversions}</td>
                      <td className={`text-right py-2 font-medium ${r.conversionRate >= 30 ? "text-green-600 dark:text-green-400" : r.conversionRate >= 15 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                        {r.conversionRate.toFixed(1)}%
                      </td>
                      <td className="text-right py-2 text-gray-600 dark:text-gray-300">
                        {r.avgDaysToConvert !== null ? `${r.avgDaysToConvert.toFixed(0)}d` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights */}
      <AIInsights />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link
          href="/dashboard/leads/new"
          className="bg-purple-600 dark:bg-purple-500 text-white rounded-lg shadow-sm p-6 hover:bg-purple-700 hover:scale-105 transition-all"
        >
          <div className="text-lg font-semibold">Add New Lead</div>
          <div className="mt-2 text-sm opacity-90">Capture a new lead</div>
        </Link>

        <Link
          href="/dashboard/leads"
          className="bg-primary dark:bg-red-500 text-white rounded-lg shadow-sm p-6 hover:bg-primary-dark hover:scale-105 transition-all"
        >
          <div className="text-lg font-semibold">Manage Leads</div>
          <div className="mt-2 text-sm opacity-90">{data.leads.byQuality.HOT} hot leads</div>
        </Link>

        <Link
          href="/dashboard/students"
          className="bg-success dark:bg-green-500 text-white rounded-lg shadow-sm p-6 hover:bg-green-600 hover:scale-105 transition-all"
        >
          <div className="text-lg font-semibold">View Students</div>
          <div className="mt-2 text-sm opacity-90">{data.students.recentEnrollments} recent</div>
        </Link>

        <Link
          href="/dashboard/payments/new"
          className="bg-warning dark:bg-yellow-500 text-white rounded-lg shadow-sm p-6 hover:bg-yellow-600 hover:scale-105 transition-all"
        >
          <div className="text-lg font-semibold">Record Payment</div>
          <div className="mt-2 text-sm opacity-90">Log a new payment</div>
        </Link>

        <Link
          href="/dashboard/insights"
          className="bg-white dark:bg-gray-800 border-2 border-primary text-primary rounded-lg shadow-sm p-6 hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-105 transition-all"
        >
          <div className="text-lg font-semibold">Full Analytics</div>
          <div className="mt-2 text-sm">Detailed insights</div>
        </Link>
      </div>
    </div>
  )
}
