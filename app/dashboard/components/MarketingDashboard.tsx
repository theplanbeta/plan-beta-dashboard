"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import BarChart from "@/components/charts/BarChart"
import LineChart from "@/components/charts/LineChart"

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
}

export default function MarketingDashboard({ userName }: { userName: string }) {
  const [data, setData] = useState<MarketingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("30")

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics/marketing?period=${period}`)
      const marketingData = await res.json()
      setData(marketingData)
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

        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Trial Show-Up</div>
          <div className={`mt-2 text-3xl font-bold ${data.kpis.trialAttendanceRate >= 60 ? "text-success" : "text-error"}`}>
            {data.kpis.trialAttendanceRate.toFixed(0)}%
          </div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {data.trials.attended}/{data.trials.scheduled} attended
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
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Trial Attended</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{data.funnel.data.trialAttended}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-8">
              <div className={`h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${data.trials.attendanceRate >= 60 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${(data.funnel.data.trialAttended / data.funnel.data.leads) * 100}%` }}>
                {((data.funnel.data.trialAttended / data.funnel.data.leads) * 100).toFixed(0)}%
              </div>
            </div>
            {data.trials.attendanceRate < 60 && (
              <p className="text-xs text-error mt-1">⚠️ Low trial attendance - {(100 - data.trials.attendanceRate).toFixed(0)}% no-show rate</p>
            )}
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

      {/* Trial Conversion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Trial Performance</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-300">Show-Up Rate</span>
                <span className={`font-bold ${data.trials.attendanceRate >= 60 ? 'text-success' : 'text-error'}`}>
                  {data.trials.attendanceRate.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${data.trials.attendanceRate >= 60 ? 'bg-success' : 'bg-error'}`}
                  style={{ width: `${data.trials.attendanceRate}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {data.trials.attended} attended / {data.trials.scheduled} scheduled
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-300">Trial → Conversion</span>
                <span className={`font-bold ${data.trials.conversionRate >= 60 ? 'text-success' : 'text-warning'}`}>
                  {data.trials.conversionRate.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${data.trials.conversionRate >= 60 ? 'bg-success' : 'bg-warning'}`}
                  style={{ width: `${data.trials.conversionRate}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {data.trials.converted} enrolled / {data.trials.attended} attended
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Lead Quality</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">🔥 HOT</span>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-error h-2 rounded-full"
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
                <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-warning h-2 rounded-full"
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
                <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-info h-2 rounded-full"
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
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
