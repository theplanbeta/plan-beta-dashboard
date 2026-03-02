"use client"

import { useState, useEffect } from "react"
import { formatCurrency } from "@/lib/utils"
import LineChart from "@/components/charts/LineChart"
import BarChart from "@/components/charts/BarChart"
import DonutChart from "@/components/charts/DonutChart"
import PeriodSelector from "@/components/charts/PeriodSelector"

type InsightsData = {
  period: number
  revenue: {
    total: number
    totalEur: number
    totalInr: number
    totalInrEurEquivalent: number
    daily: Array<{ date: string; revenue: number }>
    avgDaily: number
    projected: number
    byType: Record<string, number>
    outstanding: number
    overdue: number
  }
  costs: {
    teachers: {
      total: number
      totalEUR: number
      paid: number
      unpaid: number
      daily: Array<{ date: string; cost: number }>
      avgDaily: number
      projected: number
    }
    operatingExpenses: {
      total: number
      monthlyRecurring: number
      oneTime: number
      byCategory: Record<string, number>
      avgDaily: number
      projected: number
    }
    total: number
  }
  profitability: {
    gross: number
    margin: number
    net: number
    netMargin: number
    projected: number
    projectedMargin: number
    projectedNet: number
    projectedNetMargin: number
  }
  students: {
    total: number
    active: number
    enrollmentsByDay: Array<{ date: string; count: number }>
    avgDailyEnrollments: number
    avgLifetime: number
    avgValue: number
    cohortRetention: Array<{ month: string; retentionRate: number }>
  }
  attendance: {
    avgRate: number
    daily: Array<{ date: string; rate: number }>
    distribution: {
      excellent: number
      good: number
      average: number
      poor: number
    }
  }
  churn: {
    rate: number
    reasons: {
      lowAttendance: number
      paymentIssues: number
      other: number
    }
    byLevel: Record<string, number>
  }
  batches: {
    total: number
    performance: Array<Record<string, unknown>>
    topPerforming: Array<Record<string, unknown>>
    needsAttention: Array<Record<string, unknown>>
  }
  referrals: {
    conversionRate: number
    topReferrers: Array<Record<string, unknown>>
  }
  payments: {
    avgSize: number
    methodDistribution: Record<string, number>
    collectionEfficiency: number
  }
  kpis: {
    studentGrowthRate: number
    revenueGrowthRate: number
    avgClassSize: number
    capacityUtilization: number
    customerSatisfaction: number
    avgAttendance?: number
  }
  forecasts: {
    nextMonthRevenue: number
    nextMonthEnrollments: number
    expectedChurn: number
    projectedProfit: number
    projectedTeacherCosts: number
    projectedOperatingExpenses: number
    projectedNetProfit: number
    projectedProfitMargin: number
    projectedNetProfitMargin: number
  }
  recommendations: Array<{
    type: string
    title: string
    message: string
    action: string
  }>
  rollingPnL: Array<{
    days: number
    revenue: number
    teacherCost: number
    operatingExpenses: number
    netProfit: number
    margin: number
  }>
  monthlyPnL: Array<{
    month: string
    revenue: number
    teacherCosts: number
    operatingExpenses: number
    grossProfit: number
    netProfit: number
    margin: number
  }>
}

type BatchProfitabilityData = {
  batches: Array<{
    batchCode: string
    level: string
    status: string
    teacherName: string
    studentCount: number
    durationDays: number
    revenue: number
    teacherCost: number
    operatingCostShare: number
    totalCost: number
    profit: number
    margin: number
    perStudentProfit: number
  }>
  summary: {
    totalRevenue: number
    totalTeacherCost: number
    totalOperatingCost: number
    totalProfit: number
    avgMargin: number
  }
}

type LTVData = {
  overall: {
    avgLTV: number
    totalRevenue: number
    totalStudents: number
  }
  bySource: Array<{
    source: string
    avgLTV: number
    totalRevenue: number
    count: number
  }>
  byLevel: Array<{
    level: string
    avgLTV: number
    totalRevenue: number
    count: number
  }>
  comboVsSingle: {
    combo: { avgLTV: number; count: number }
    single: { avgLTV: number; count: number }
  }
  levelDistribution: Record<string, number>
}

type ForecastData = {
  pipeline: {
    interestedLeads: number
    conversionRate: number
    avgCourseFee: number
    pipelineValue: number
  }
  fillingBatches: {
    count: number
    enrolledRevenue: number
    potentialRevenue: number
    totalExpected: number
  }
  monthlyRevenue: Record<string, number>
  forecast: Array<{
    month: string
    projected: number
  }>
  avgMonthlyRevenue: number
}

type ContentPerformanceData = {
  content: Array<Record<string, unknown>>
  totals: {
    totalViews: number
    totalLeads: number
    totalEnrollments: number
    totalRevenue: number
    avgEngagementRate: number
    avgConversionRate: number
  }
  byPlatform: Array<{ platform: string; count: number; views: number; leads: number; revenue: number }>
  byContentType: Array<{ type: string; count: number; views: number; leads: number; revenue: number }>
  topByROI: Array<Record<string, unknown>>
  topByLeads: Array<Record<string, unknown>>
}

type DemographicsData = {
  totalStudents: number
  cityDistribution: Array<{ city: string; count: number; percentage: number }>
  professionDistribution: Array<{ profession: string; count: number; percentage: number }>
  ageBuckets: Array<{ range: string; count: number; percentage: number }>
  relocation: {
    relocatingCount: number
    percentage: number
    byTimeline: Array<{ timeline: string; count: number }>
    topDestinations: Array<{ city: string; count: number }>
    byVisaStatus: Array<{ status: string; count: number }>
  }
  sourceDistribution: Array<{ source: string; count: number; percentage: number }>
}

type ProgressionData = {
  transitions: Array<{
    from: string
    to: string
    total: number
    converted: number
    conversionRate: number
    revenue: number
    avgProgress: number
  }>
  funnel: Array<{
    level: string
    students: number
    progressedToNext: number
    progressionRate: number
  }>
  summary: {
    totalUpsells: number
    totalConverted: number
    overallConversionRate: number
    totalRevenue: number
  }
}

type TeacherPerformanceData = {
  teachers: Array<{
    id: string
    name: string
    email: string
    totalHours: number
    totalCostINR: number
    totalCostEUR: number
    batchCount: number
    studentCount: number
    avgAttendanceRate: number
    churnRate: number
    costPerStudent: number
    costPerHour: number
  }>
  summary: {
    totalTeachers: number
    totalHours: number
    totalCostINR: number
    totalCostEUR: number
    avgCostPerHour: number
    avgAttendanceRate: number
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  INFRASTRUCTURE: "#3b82f6",
  TOOLS_SOFTWARE: "#8b5cf6",
  MARKETING: "#f59e0b",
  ADMINISTRATIVE: "#10b981",
  OTHER: "#6b7280",
}

const SOURCE_COLORS: Record<string, string> = {
  META_ADS: "#3b82f6",
  INSTAGRAM: "#e11d48",
  GOOGLE: "#10b981",
  ORGANIC: "#f59e0b",
  REFERRAL: "#8b5cf6",
  OTHER: "#6b7280",
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("30")
  const [activeTab, setActiveTab] = useState<"overview" | "batches" | "pnl" | "ltv" | "forecast" | "content" | "demographics" | "progression" | "teachers">("overview")
  const [batchData, setBatchData] = useState<BatchProfitabilityData | null>(null)
  const [batchLoading, setBatchLoading] = useState(false)
  const [ltvData, setLtvData] = useState<LTVData | null>(null)
  const [ltvLoading, setLtvLoading] = useState(false)
  const [forecastData, setForecastData] = useState<ForecastData | null>(null)
  const [forecastLoading, setForecastLoading] = useState(false)
  const [contentData, setContentData] = useState<ContentPerformanceData | null>(null)
  const [contentLoading, setContentLoading] = useState(false)
  const [demographicsData, setDemographicsData] = useState<DemographicsData | null>(null)
  const [demographicsLoading, setDemographicsLoading] = useState(false)
  const [progressionData, setProgressionData] = useState<ProgressionData | null>(null)
  const [progressionLoading, setProgressionLoading] = useState(false)
  const [teacherData, setTeacherData] = useState<TeacherPerformanceData | null>(null)
  const [teacherLoading, setTeacherLoading] = useState(false)

  useEffect(() => {
    fetchInsights()
  }, [period])

  useEffect(() => {
    if (activeTab === "batches") {
      fetchBatchProfitability()
    } else if (activeTab === "ltv") {
      fetchLTV()
    } else if (activeTab === "forecast") {
      fetchForecast()
    } else if (activeTab === "content") {
      fetchContentPerformance()
    } else if (activeTab === "demographics") {
      fetchDemographics()
    } else if (activeTab === "progression") {
      fetchProgression()
    } else if (activeTab === "teachers") {
      fetchTeacherPerformance()
    }
  }, [activeTab, period])

  const fetchInsights = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics/insights?period=${period}`)
      const insightsData = await res.json()
      setData(insightsData)
    } catch (error) {
      console.error("Error fetching insights:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBatchProfitability = async () => {
    setBatchLoading(true)
    try {
      const res = await fetch(`/api/analytics/batch-profitability?period=${period}`)
      const result = await res.json()
      setBatchData(result)
    } catch (error) {
      console.error("Error fetching batch profitability:", error)
    } finally {
      setBatchLoading(false)
    }
  }

  const fetchLTV = async () => {
    setLtvLoading(true)
    try {
      const res = await fetch("/api/analytics/ltv")
      const result = await res.json()
      setLtvData(result)
    } catch (error) {
      console.error("Error fetching LTV data:", error)
    } finally {
      setLtvLoading(false)
    }
  }

  const fetchForecast = async () => {
    setForecastLoading(true)
    try {
      const res = await fetch("/api/analytics/forecast")
      const result = await res.json()
      setForecastData(result)
    } catch (error) {
      console.error("Error fetching forecast data:", error)
    } finally {
      setForecastLoading(false)
    }
  }

  const fetchContentPerformance = async () => {
    setContentLoading(true)
    try {
      const res = await fetch("/api/analytics/content-performance")
      const result = await res.json()
      setContentData(result)
    } catch (error) {
      console.error("Error fetching content performance:", error)
    } finally {
      setContentLoading(false)
    }
  }

  const fetchDemographics = async () => {
    setDemographicsLoading(true)
    try {
      const res = await fetch("/api/analytics/demographics")
      const result = await res.json()
      setDemographicsData(result)
    } catch (error) {
      console.error("Error fetching demographics:", error)
    } finally {
      setDemographicsLoading(false)
    }
  }

  const fetchProgression = async () => {
    setProgressionLoading(true)
    try {
      const res = await fetch("/api/analytics/progression")
      const result = await res.json()
      setProgressionData(result)
    } catch (error) {
      console.error("Error fetching progression data:", error)
    } finally {
      setProgressionLoading(false)
    }
  }

  const fetchTeacherPerformance = async () => {
    setTeacherLoading(true)
    try {
      const res = await fetch("/api/analytics/teacher-performance")
      const result = await res.json()
      setTeacherData(result)
    } catch (error) {
      console.error("Error fetching teacher performance:", error)
    } finally {
      setTeacherLoading(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading insights...</div>
      </div>
    )
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Insights & Analytics</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Data-driven insights to grow your school</p>
        </div>

        <PeriodSelector
          value={parseInt(period)}
          onChange={(days) => setPeriod(String(days || 365))}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6">
          {[
            { key: "overview" as const, label: "Overview" },
            { key: "batches" as const, label: "Batch Profitability" },
            { key: "pnl" as const, label: "P&L Breakdown" },
            { key: "ltv" as const, label: "LTV Analysis" },
            { key: "forecast" as const, label: "Revenue Forecast" },
            { key: "content" as const, label: "Content ROI" },
            { key: "demographics" as const, label: "Demographics" },
            { key: "progression" as const, label: "Student Journey" },
            { key: "teachers" as const, label: "Teacher Performance" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "overview" && (<>
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Student Growth</div>
          <div className={`text-2xl font-bold mt-1 ${data.kpis.studentGrowthRate >= 0 ? "text-success" : "text-error"}`}>
            {data.kpis.studentGrowthRate >= 0 ? "+" : ""}{data.kpis.studentGrowthRate}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Net change</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Revenue Growth</div>
          <div className={`text-2xl font-bold mt-1 ${data.kpis.revenueGrowthRate >= 0 ? "text-success" : "text-error"}`}>
            {data.kpis.revenueGrowthRate >= 0 ? "+" : ""}{data.kpis.revenueGrowthRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Period over period</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Class Size</div>
          <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
            {data.kpis.avgClassSize.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Students per batch</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Capacity Used</div>
          <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
            {data.kpis.capacityUtilization.toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Batch utilization</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Attendance</div>
          <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
            {(data.kpis.avgAttendance ?? data.kpis.customerSatisfaction)?.toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Across all batches</div>
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

      {/* Profitability Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profitability Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</div>
            <div className="text-2xl font-bold text-success mt-1">
              {formatCurrency(data.revenue.total, 'EUR')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {data.revenue.totalEur > 0 && `EUR: €${data.revenue.totalEur.toFixed(2)}`}
              {data.revenue.totalEur > 0 && data.revenue.totalInr > 0 && ' | '}
              {data.revenue.totalInr > 0 && `INR: ₹${data.revenue.totalInr.toFixed(2)}`}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Teacher Costs</div>
            <div className="text-2xl font-bold text-error mt-1">
              {formatCurrency(data.costs.teachers.totalEUR, 'EUR')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">INR: ₹{data.costs.teachers.total.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Operating Expenses</div>
            <div className="text-2xl font-bold text-orange-500 mt-1">
              {formatCurrency(data.costs.operatingExpenses?.total || 0, 'EUR')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formatCurrency(data.costs.operatingExpenses?.monthlyRecurring || 0, 'EUR')}/mo recurring
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Gross Profit</div>
            <div className={`text-2xl font-bold mt-1 ${data.profitability.gross >= 0 ? "text-success" : "text-error"}`}>
              {formatCurrency(data.profitability.gross, 'EUR')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Revenue - teacher costs</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Net Profit</div>
            <div className={`text-2xl font-bold mt-1 ${(data.profitability.net || 0) >= 0 ? "text-success" : "text-error"}`}>
              {formatCurrency(data.profitability.net || 0, 'EUR')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">After all expenses</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Net Margin</div>
            <div className={`text-2xl font-bold mt-1 ${(data.profitability.netMargin || 0) >= 0 ? "text-success" : "text-error"}`}>
              {(data.profitability.netMargin || 0).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">True profit margin</div>
          </div>
        </div>
      </div>

      {/* Rolling P&L Windows */}
      {data.rollingPnL && data.rollingPnL.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rolling P&L</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.rollingPnL.map((window) => (
              <div key={window.days} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">{window.days}-Day Window</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Revenue</span>
                    <span className="font-medium text-success">{formatCurrency(window.revenue, 'EUR')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Teacher Costs</span>
                    <span className="font-medium text-error">{formatCurrency(window.teacherCost, 'EUR')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Operating Exp.</span>
                    <span className="font-medium text-orange-500">{formatCurrency(window.operatingExpenses, 'EUR')}</span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-2 flex justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Net Profit</span>
                    <span className={`font-bold ${window.netProfit >= 0 ? "text-success" : "text-error"}`}>
                      {formatCurrency(window.netProfit, 'EUR')} ({window.margin.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Trend (EUR)</h2>
          <LineChart
            data={data.revenue.daily.map((d) => ({ date: d.date, value: d.revenue }))}
            color="#10b981"
            valuePrefix="€"
          />
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Daily</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(data.revenue.avgDaily)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Projected Monthly</div>
              <div className="text-xl font-bold text-success">
                {formatCurrency(data.revenue.projected)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue by Type (EUR)</h2>
          <BarChart
            data={Object.entries(data.revenue.byType).map(([label, value]) => ({
              label: label.replace(/_/g, " "),
              value,
              color: "#3b82f6",
            }))}
            valuePrefix="€"
          />
        </div>
      </div>

      {/* Student Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Enrollment Trend</h2>
          <LineChart
            data={data.students.enrollmentsByDay.map((d) => ({ date: d.date, value: d.count }))}
            color="#8b5cf6"
          />
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Daily</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {data.students.avgDailyEnrollments.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Lifetime</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {data.students.avgLifetime} days
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Value</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(data.students.avgValue)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Attendance Distribution</h2>
          <DonutChart
            data={[
              { label: "Excellent (≥90%)", value: data.attendance.distribution.excellent, color: "#10b981" },
              { label: "Good (75-90%)", value: data.attendance.distribution.good, color: "#3b82f6" },
              { label: "Average (50-75%)", value: data.attendance.distribution.average, color: "#f59e0b" },
              { label: "Poor (<50%)", value: data.attendance.distribution.poor, color: "#ef4444" },
            ]}
          />
        </div>
      </div>

      {/* Churn & Retention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Churn Analysis
            <span className={`ml-3 text-2xl font-bold ${data.churn.rate > 10 ? "text-error" : "text-success"}`}>
              {data.churn.rate.toFixed(1)}%
            </span>
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">Low Attendance</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-error h-2 rounded-full"
                    style={{
                      width: `${
                        (data.churn.reasons.lowAttendance /
                          (data.churn.reasons.lowAttendance +
                            data.churn.reasons.paymentIssues +
                            data.churn.reasons.other)) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <span className="font-semibold w-8 text-right text-gray-900 dark:text-white">
                  {data.churn.reasons.lowAttendance}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">Payment Issues</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-warning h-2 rounded-full"
                    style={{
                      width: `${
                        (data.churn.reasons.paymentIssues /
                          (data.churn.reasons.lowAttendance +
                            data.churn.reasons.paymentIssues +
                            data.churn.reasons.other)) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <span className="font-semibold w-8 text-right text-gray-900 dark:text-white">
                  {data.churn.reasons.paymentIssues}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">Other Reasons</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-info h-2 rounded-full"
                    style={{
                      width: `${
                        (data.churn.reasons.other /
                          (data.churn.reasons.lowAttendance +
                            data.churn.reasons.paymentIssues +
                            data.churn.reasons.other)) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <span className="font-semibold w-8 text-right text-gray-900 dark:text-white">
                  {data.churn.reasons.other}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cohort Retention</h2>
          <BarChart
            data={data.students.cohortRetention.slice(-6).map((d) => ({
              label: new Date(d.month + "-01").toLocaleDateString("en-US", { month: "short" }),
              value: d.retentionRate,
              color: d.retentionRate >= 80 ? "#10b981" : d.retentionRate >= 60 ? "#f59e0b" : "#ef4444",
            }))}
            valueSuffix="%"
          />
        </div>
      </div>

      {/* Batch Performance */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Batch Performance</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-success mb-3">Top Performing Batches</h3>
            <div className="space-y-2">
              {data.batches.topPerforming.map((batch: Record<string, unknown>, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 bg-success/5 dark:bg-success/10 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{String(batch.batchCode)}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{String(batch.enrolledCount)} students</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-success">{Number(batch.profitMargin).toFixed(0)}%</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">profit margin</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-error mb-3">Needs Attention</h3>
            <div className="space-y-2">
              {data.batches.needsAttention.map((batch, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-error/5 dark:bg-error/10 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{String(batch.batchCode)}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{String(batch.enrolledCount)} students</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-error">{Number(batch.avgAttendance).toFixed(0)}%</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">attendance</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Forecasts */}
      <div className="bg-gradient-to-br from-primary to-primary-dark text-white rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4 text-white">Next Month Forecast</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <div>
            <div className="text-sm opacity-90 text-white">Revenue</div>
            <div className="text-2xl font-bold mt-1 text-white">
              {formatCurrency(data.forecasts.nextMonthRevenue, 'EUR')}
            </div>
          </div>
          <div>
            <div className="text-sm opacity-90 text-white">Teacher Costs</div>
            <div className="text-2xl font-bold mt-1 text-white">
              {formatCurrency(data.forecasts.projectedTeacherCosts, 'EUR')}
            </div>
          </div>
          <div>
            <div className="text-sm opacity-90 text-white">Operating Exp.</div>
            <div className="text-2xl font-bold mt-1 text-white">
              {formatCurrency(data.forecasts.projectedOperatingExpenses || 0, 'EUR')}
            </div>
          </div>
          <div>
            <div className="text-sm opacity-90 text-white">Net Profit</div>
            <div className="text-2xl font-bold mt-1 text-white">
              {formatCurrency(data.forecasts.projectedNetProfit || data.forecasts.projectedProfit, 'EUR')}
            </div>
            <div className="text-xs opacity-75 text-white mt-1">
              {(data.forecasts.projectedNetProfitMargin || data.forecasts.projectedProfitMargin).toFixed(1)}% margin
            </div>
          </div>
          <div>
            <div className="text-sm opacity-90 text-white">Enrollments</div>
            <div className="text-2xl font-bold mt-1 text-white">{data.forecasts.nextMonthEnrollments}</div>
          </div>
          <div>
            <div className="text-sm opacity-90 text-white">Expected Churn</div>
            <div className="text-2xl font-bold mt-1 text-white">{data.forecasts.expectedChurn}</div>
          </div>
        </div>
      </div>

      {/* Payment & Collection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Methods</h2>
          <DonutChart
            data={Object.entries(data.payments.methodDistribution).map(([label, value]) => ({
              label: label.replace(/_/g, " "),
              value,
              color: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"][
                Object.keys(data.payments.methodDistribution).indexOf(label)
              ],
            }))}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Collection Metrics</h2>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-300">Collection Efficiency</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {data.payments.collectionEfficiency.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    data.payments.collectionEfficiency >= 80 ? "bg-success" : "bg-warning"
                  }`}
                  style={{ width: `${data.payments.collectionEfficiency}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Payment</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(data.payments.avgSize)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Outstanding</div>
                <div className="text-xl font-bold text-warning mt-1">
                  {formatCurrency(data.revenue.outstanding)}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-error">Overdue Amount</div>
              <div className="text-2xl font-bold text-error mt-1">
                {formatCurrency(data.revenue.overdue)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Referrers */}
      {data.referrals.topReferrers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Referrers
            <span className="ml-3 text-sm font-normal text-gray-600 dark:text-gray-400">
              Conversion: {data.referrals.conversionRate.toFixed(0)}%
            </span>
          </h2>
          <div className="space-y-2">
            {data.referrals.topReferrers.map((referrer, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center font-bold text-primary">
                    #{index + 1}
                  </div>
                  <div className="font-medium text-gray-900 dark:text-white">{String(referrer.name)}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900 dark:text-white">
                    {String(referrer.successfulReferrals)} successful
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {String(referrer.referralCount)} total referrals
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </>)}

      {/* Batch Profitability Tab */}
      {activeTab === "batches" && (
        <div className="space-y-6">
          {batchLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Loading batch profitability...</div>
            </div>
          ) : batchData ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</div>
                  <div className="text-2xl font-bold text-success mt-1">
                    {formatCurrency(batchData.summary.totalRevenue, 'EUR')}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Teacher Costs</div>
                  <div className="text-2xl font-bold text-error mt-1">
                    {formatCurrency(batchData.summary.totalTeacherCost, 'EUR')}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Operating Costs</div>
                  <div className="text-2xl font-bold text-orange-500 mt-1">
                    {formatCurrency(batchData.summary.totalOperatingCost, 'EUR')}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Profit</div>
                  <div className={`text-2xl font-bold mt-1 ${batchData.summary.totalProfit >= 0 ? "text-success" : "text-error"}`}>
                    {formatCurrency(batchData.summary.totalProfit, 'EUR')}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Avg Margin</div>
                  <div className={`text-2xl font-bold mt-1 ${batchData.summary.avgMargin >= 0 ? "text-success" : "text-error"}`}>
                    {batchData.summary.avgMargin.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Batch Profitability Table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Per-Batch Profitability</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Batch</th>
                        <th className="text-left py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Level</th>
                        <th className="text-left py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Teacher</th>
                        <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Students</th>
                        <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Days</th>
                        <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Revenue</th>
                        <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Teacher</th>
                        <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">OpEx</th>
                        <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Profit</th>
                        <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Margin</th>
                        <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Per Student</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchData.batches.map((batch) => (
                        <tr key={batch.batchCode} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">{batch.batchCode}</td>
                          <td className="py-3 px-2 text-gray-600 dark:text-gray-300">{batch.level}</td>
                          <td className="py-3 px-2 text-gray-600 dark:text-gray-300">{batch.teacherName}</td>
                          <td className="py-3 px-2 text-right text-gray-900 dark:text-white">{batch.studentCount}</td>
                          <td className="py-3 px-2 text-right text-gray-600 dark:text-gray-300">{batch.durationDays}</td>
                          <td className="py-3 px-2 text-right text-success">{formatCurrency(batch.revenue, 'EUR')}</td>
                          <td className="py-3 px-2 text-right text-error">{formatCurrency(batch.teacherCost, 'EUR')}</td>
                          <td className="py-3 px-2 text-right text-orange-500">{formatCurrency(batch.operatingCostShare, 'EUR')}</td>
                          <td className={`py-3 px-2 text-right font-bold ${batch.profit >= 0 ? "text-success" : "text-error"}`}>
                            {formatCurrency(batch.profit, 'EUR')}
                          </td>
                          <td className={`py-3 px-2 text-right ${batch.margin >= 0 ? "text-success" : "text-error"}`}>
                            {batch.margin.toFixed(1)}%
                          </td>
                          <td className={`py-3 px-2 text-right ${batch.perStudentProfit >= 0 ? "text-success" : "text-error"}`}>
                            {formatCurrency(batch.perStudentProfit, 'EUR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Batch Profit Comparison Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Batch Profit Comparison</h2>
                <BarChart
                  data={batchData.batches.map((batch) => ({
                    label: batch.batchCode,
                    value: batch.profit,
                    color: batch.profit >= 0 ? "#10b981" : "#ef4444",
                  }))}
                  valuePrefix="€"
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Failed to load batch profitability data.</div>
            </div>
          )}
        </div>
      )}

      {/* LTV Analysis Tab */}
      {activeTab === "ltv" && (
        <div className="space-y-6">
          {ltvLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Loading LTV analysis...</div>
            </div>
          ) : ltvData ? (
            <>
              {/* Overall LTV Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Average Student Lifetime Value (EUR)</h2>
                <div className="text-4xl font-bold text-primary">
                  {formatCurrency(ltvData.overall.avgLTV, 'EUR')}
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {ltvData.overall.totalStudents} students | Total revenue: {formatCurrency(ltvData.overall.totalRevenue, 'EUR')}
                </div>
              </div>

              {/* LTV by Source + LTV by Level */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">LTV by Source</h2>
                  <BarChart
                    data={ltvData.bySource.map((s) => ({
                      label: s.source.replace(/_/g, " "),
                      value: s.avgLTV,
                      color: SOURCE_COLORS[s.source] || "#6b7280",
                    }))}
                    valuePrefix="€"
                  />
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">LTV by Level</h2>
                  <BarChart
                    data={ltvData.byLevel.map((l) => ({
                      label: l.level,
                      value: l.avgLTV,
                      color: "#3b82f6",
                    }))}
                    valuePrefix="€"
                  />
                </div>
              </div>

              {/* Combo vs Single */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border-2 p-6 ${
                  ltvData.comboVsSingle.combo.avgLTV >= ltvData.comboVsSingle.single.avgLTV
                    ? "border-success"
                    : "border-gray-200 dark:border-gray-700"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Combo Students</h3>
                    {ltvData.comboVsSingle.combo.avgLTV >= ltvData.comboVsSingle.single.avgLTV && (
                      <span className="text-xs font-medium bg-success/10 text-success px-2 py-1 rounded-full">Higher LTV</span>
                    )}
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(ltvData.comboVsSingle.combo.avgLTV, 'EUR')}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {ltvData.comboVsSingle.combo.count} students
                  </div>
                </div>

                <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border-2 p-6 ${
                  ltvData.comboVsSingle.single.avgLTV > ltvData.comboVsSingle.combo.avgLTV
                    ? "border-success"
                    : "border-gray-200 dark:border-gray-700"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Single Level</h3>
                    {ltvData.comboVsSingle.single.avgLTV > ltvData.comboVsSingle.combo.avgLTV && (
                      <span className="text-xs font-medium bg-success/10 text-success px-2 py-1 rounded-full">Higher LTV</span>
                    )}
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(ltvData.comboVsSingle.single.avgLTV, 'EUR')}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {ltvData.comboVsSingle.single.count} students
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Failed to load LTV data.</div>
            </div>
          )}
        </div>
      )}

      {/* Revenue Forecast Tab */}
      {activeTab === "forecast" && (
        <div className="space-y-6">
          {forecastLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Loading revenue forecast...</div>
            </div>
          ) : forecastData ? (
            <>
              {/* Pipeline & Filling Batches Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Pipeline Value</h2>
                  <div className="text-3xl font-bold text-primary">
                    {formatCurrency(forecastData.pipeline.pipelineValue, 'EUR')}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {forecastData.pipeline.interestedLeads} interested leads x {forecastData.pipeline.conversionRate}% conversion x {formatCurrency(forecastData.pipeline.avgCourseFee, 'EUR')} avg fee
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Filling Batches ({forecastData.fillingBatches.count})</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Enrolled Revenue</span>
                      <span className="font-medium text-success">{formatCurrency(forecastData.fillingBatches.enrolledRevenue, 'EUR')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Potential Revenue</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(forecastData.fillingBatches.potentialRevenue, 'EUR')}</span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Total Expected</span>
                      <span className="font-bold text-primary">{formatCurrency(forecastData.fillingBatches.totalExpected, 'EUR')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Revenue Trend */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Revenue Trend (EUR)</h2>
                {Object.keys(forecastData.monthlyRevenue).length > 0 ? (
                  <LineChart
                    data={Object.entries(forecastData.monthlyRevenue)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([month, amount]) => ({
                        date: month + "-15",
                        value: amount,
                      }))}
                    color="#10b981"
                    valuePrefix="€"
                  />
                ) : (
                  <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
                    No monthly revenue data available.
                  </div>
                )}
              </div>

              {/* 3-Month Forecast */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">3-Month Revenue Forecast</h2>
                <BarChart
                  data={forecastData.forecast.map((f) => ({
                    label: new Date(f.month + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" }),
                    value: f.projected,
                    color: "#3b82f680",
                  }))}
                  valuePrefix="€"
                />
                <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  Based on {formatCurrency(forecastData.avgMonthlyRevenue, 'EUR')}/month rolling average with 5% monthly growth assumption
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Failed to load forecast data.</div>
            </div>
          )}
        </div>
      )}

      {/* Content ROI Tab */}
      {activeTab === "content" && (
        <div className="space-y-6">
          {contentLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Loading content performance...</div>
            </div>
          ) : contentData ? (
            <>
              {/* Totals Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: "Total Views", value: contentData.totals.totalViews.toLocaleString() },
                  { label: "Leads Generated", value: contentData.totals.totalLeads.toLocaleString() },
                  { label: "Enrollments", value: contentData.totals.totalEnrollments.toLocaleString() },
                  { label: "Revenue", value: formatCurrency(contentData.totals.totalRevenue, 'EUR') },
                  { label: "Avg Engagement", value: `${contentData.totals.avgEngagementRate.toFixed(1)}%` },
                  { label: "Avg Conversion", value: `${contentData.totals.avgConversionRate.toFixed(1)}%` },
                ].map((card) => (
                  <div key={card.label} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{card.label}</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">{card.value}</div>
                  </div>
                ))}
              </div>

              {/* By Platform & By Content Type */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance by Platform</h2>
                  {contentData.byPlatform.length > 0 ? (
                    <BarChart
                      data={contentData.byPlatform.map((p) => ({
                        label: p.platform,
                        value: p.views,
                        color: SOURCE_COLORS[p.platform] || "#6b7280",
                      }))}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">No platform data</div>
                  )}
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance by Content Type</h2>
                  {contentData.byContentType.length > 0 ? (
                    <BarChart
                      data={contentData.byContentType.map((t) => ({
                        label: t.type,
                        value: t.leads,
                        color: "#3b82f6",
                      }))}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">No content type data</div>
                  )}
                </div>
              </div>

              {/* Top Content by ROI */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Content by ROI</h2>
                {contentData.topByROI.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Content</th>
                          <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Views</th>
                          <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Leads</th>
                          <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Revenue</th>
                          <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">ROI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contentData.topByROI.map((item, i) => (
                          <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50">
                            <td className="py-3 px-2 text-gray-900 dark:text-white truncate max-w-[200px]">
                              {(item.contentType as string) || "—"} ({(item.platform as string) || ""})
                            </td>
                            <td className="py-3 px-2 text-right text-gray-600 dark:text-gray-300">{((item.views as number) || 0).toLocaleString()}</td>
                            <td className="py-3 px-2 text-right text-gray-600 dark:text-gray-300">{(item.leadsGenerated as number) || 0}</td>
                            <td className="py-3 px-2 text-right text-success">{formatCurrency(Number(item.revenue) || 0, 'EUR')}</td>
                            <td className="py-3 px-2 text-right font-bold text-primary">{Number(item.roi || 0).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">No ROI data yet</div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Failed to load content data.</div>
            </div>
          )}
        </div>
      )}

      {/* Demographics Tab */}
      {activeTab === "demographics" && (
        <div className="space-y-6">
          {demographicsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Loading demographics...</div>
            </div>
          ) : demographicsData ? (
            <>
              {/* Total Students */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Active Students</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{demographicsData.totalStudents}</div>
              </div>

              {/* City & Profession Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">City Distribution</h2>
                  {demographicsData.cityDistribution.length > 0 ? (
                    <BarChart
                      data={demographicsData.cityDistribution.map((c) => ({
                        label: c.city || "Unknown",
                        value: c.count,
                        color: "#3b82f6",
                      }))}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">No city data</div>
                  )}
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profession Distribution</h2>
                  {demographicsData.professionDistribution.length > 0 ? (
                    <BarChart
                      data={demographicsData.professionDistribution.map((p) => ({
                        label: p.profession || "Unknown",
                        value: p.count,
                        color: "#8b5cf6",
                      }))}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">No profession data</div>
                  )}
                </div>
              </div>

              {/* Age Distribution & Source Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Age Distribution</h2>
                  <DonutChart
                    data={demographicsData.ageBuckets.map((b, i) => ({
                      label: b.range,
                      value: b.count,
                      color: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6b7280"][i] || "#6b7280",
                    }))}
                  />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Source Distribution</h2>
                  <DonutChart
                    data={demographicsData.sourceDistribution.map((s) => ({
                      label: s.source.replace(/_/g, " "),
                      value: s.count,
                      color: SOURCE_COLORS[s.source] || "#6b7280",
                    }))}
                  />
                </div>
              </div>

              {/* Relocation Analysis */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Relocation to Germany</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <div className="text-2xl font-bold text-primary">{demographicsData.relocation.relocatingCount}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Planning to relocate ({demographicsData.relocation.percentage.toFixed(1)}%)</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">By Timeline</h3>
                    {demographicsData.relocation.byTimeline.map((t) => (
                      <div key={t.timeline} className="flex justify-between py-1 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{(t.timeline || "Unknown").replace(/_/g, " ")}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{t.count}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Top Destinations</h3>
                    {demographicsData.relocation.topDestinations.map((d) => (
                      <div key={d.city} className="flex justify-between py-1 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{d.city || "Unknown"}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{d.count}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Visa Status</h3>
                    {demographicsData.relocation.byVisaStatus.map((v) => (
                      <div key={v.status} className="flex justify-between py-1 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{(v.status || "Unknown").replace(/_/g, " ")}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{v.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Failed to load demographics.</div>
            </div>
          )}
        </div>
      )}

      {/* Student Journey Tab */}
      {activeTab === "progression" && (
        <div className="space-y-6">
          {progressionLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Loading progression data...</div>
            </div>
          ) : progressionData ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Upsells", value: progressionData.summary.totalUpsells.toLocaleString() },
                  { label: "Converted", value: progressionData.summary.totalConverted.toLocaleString() },
                  { label: "Conversion Rate", value: `${progressionData.summary.overallConversionRate.toFixed(1)}%` },
                  { label: "Upsell Revenue", value: formatCurrency(progressionData.summary.totalRevenue, 'EUR') },
                ].map((card) => (
                  <div key={card.label} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{card.label}</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">{card.value}</div>
                  </div>
                ))}
              </div>

              {/* Progression Funnel */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Level Progression Funnel</h2>
                <div className="space-y-3">
                  {progressionData.funnel.map((level, i) => {
                    const maxStudents = Math.max(...progressionData.funnel.map((f) => f.students), 1)
                    const widthPct = (level.students / maxStudents) * 100
                    return (
                      <div key={level.level} className="flex items-center gap-4">
                        <div className="w-12 text-sm font-bold text-gray-900 dark:text-white">{level.level}</div>
                        <div className="flex-1">
                          <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-orange-500 rounded-full flex items-center px-3"
                              style={{ width: `${Math.max(widthPct, 5)}%` }}
                            >
                              <span className="text-xs text-white font-medium">{level.students} students</span>
                            </div>
                          </div>
                        </div>
                        {i < progressionData.funnel.length - 1 && (
                          <div className="w-24 text-right text-sm">
                            <span className={`font-medium ${level.progressionRate >= 70 ? "text-success" : level.progressionRate >= 50 ? "text-yellow-500" : "text-error"}`}>
                              {level.progressionRate.toFixed(1)}%
                            </span>
                            <div className="text-xs text-gray-500 dark:text-gray-400">progressed</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Transitions Table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Level Transition Details</h2>
                {progressionData.transitions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Transition</th>
                          <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Total</th>
                          <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Converted</th>
                          <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Rate</th>
                          <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Revenue</th>
                          <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Avg Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {progressionData.transitions.map((t) => (
                          <tr key={`${t.from}-${t.to}`} className="border-b border-gray-100 dark:border-gray-700/50">
                            <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">{t.from} → {t.to}</td>
                            <td className="py-3 px-2 text-right text-gray-600 dark:text-gray-300">{t.total}</td>
                            <td className="py-3 px-2 text-right text-gray-600 dark:text-gray-300">{t.converted}</td>
                            <td className={`py-3 px-2 text-right font-medium ${t.conversionRate >= 70 ? "text-success" : t.conversionRate >= 50 ? "text-yellow-500" : "text-error"}`}>
                              {t.conversionRate.toFixed(1)}%
                            </td>
                            <td className="py-3 px-2 text-right text-success">{formatCurrency(t.revenue, 'EUR')}</td>
                            <td className="py-3 px-2 text-right text-gray-600 dark:text-gray-300">{t.avgProgress.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">No transition data available</div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Failed to load progression data.</div>
            </div>
          )}
        </div>
      )}

      {/* P&L Breakdown Tab */}
      {activeTab === "pnl" && (
        <div className="space-y-6">
          {/* Monthly P&L Table */}
          {data.monthlyPnL && data.monthlyPnL.length > 0 ? (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly P&L Statement</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Month</th>
                        <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Revenue</th>
                        <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Teacher Costs</th>
                        <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Operating Exp.</th>
                        <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Gross Profit</th>
                        <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Net Profit</th>
                        <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthlyPnL.map((month) => (
                        <tr key={month.month} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">
                            {new Date(month.month + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                          </td>
                          <td className="py-3 px-2 text-right text-success">{formatCurrency(month.revenue, 'EUR')}</td>
                          <td className="py-3 px-2 text-right text-error">{formatCurrency(month.teacherCosts, 'EUR')}</td>
                          <td className="py-3 px-2 text-right text-orange-500">{formatCurrency(month.operatingExpenses, 'EUR')}</td>
                          <td className={`py-3 px-2 text-right ${month.grossProfit >= 0 ? "text-success" : "text-error"}`}>
                            {formatCurrency(month.grossProfit, 'EUR')}
                          </td>
                          <td className={`py-3 px-2 text-right font-bold ${month.netProfit >= 0 ? "text-success" : "text-error"}`}>
                            {formatCurrency(month.netProfit, 'EUR')}
                          </td>
                          <td className={`py-3 px-2 text-right ${month.margin >= 0 ? "text-success" : "text-error"}`}>
                            {month.margin.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Net Profit Trend Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Net Profit Trend</h2>
                  <LineChart
                    data={data.monthlyPnL.map((m) => ({
                      date: m.month + "-01",
                      value: m.netProfit,
                    }))}
                    color="#10b981"
                    valuePrefix="€"
                  />
                </div>

                {/* Expense Breakdown by Category */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Expense Breakdown</h2>
                  {data.costs.operatingExpenses?.byCategory && Object.keys(data.costs.operatingExpenses.byCategory).length > 0 ? (
                    <DonutChart
                      data={Object.entries(data.costs.operatingExpenses.byCategory).map(([label, value]) => ({
                        label: label.replace(/_/g, " "),
                        value,
                        color: CATEGORY_COLORS[label] || "#6b7280",
                      }))}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
                      No expense data yet. Add expenses in the Expenses page.
                    </div>
                  )}
                </div>
              </div>

              {/* Revenue vs Costs Comparison */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Revenue vs Costs</h2>
                <BarChart
                  data={data.monthlyPnL.flatMap((m) => [
                    {
                      label: new Date(m.month + "-01").toLocaleDateString("en-US", { month: "short" }) + " Rev",
                      value: m.revenue,
                      color: "#10b981",
                    },
                    {
                      label: new Date(m.month + "-01").toLocaleDateString("en-US", { month: "short" }) + " Cost",
                      value: m.teacherCosts + m.operatingExpenses,
                      color: "#ef4444",
                    },
                  ])}
                  valuePrefix="€"
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">
                No monthly P&L data available. Try selecting a longer period.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Teacher Performance Tab */}
      {activeTab === "teachers" && (
        <div className="space-y-6">
          {teacherLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Loading teacher performance...</div>
            </div>
          ) : teacherData ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Teachers</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{teacherData.summary.totalTeachers}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Hours</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{teacherData.summary.totalHours.toFixed(1)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Cost (EUR)</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(teacherData.summary.totalCostEUR)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Avg Attendance</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{teacherData.summary.avgAttendanceRate.toFixed(1)}%</p>
                </div>
              </div>

              {/* Teacher Comparison - Hours vs Cost */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Hours by Teacher</h3>
                  <BarChart
                    data={teacherData.teachers.map(t => ({
                      label: t.name.split(" ")[0],
                      value: t.totalHours,
                      color: "#3b82f6",
                    }))}
                    height={250}
                    valueSuffix=" hrs"
                  />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Attendance by Teacher</h3>
                  <BarChart
                    data={teacherData.teachers.map(t => ({
                      label: t.name.split(" ")[0],
                      value: Math.round(t.avgAttendanceRate * 10) / 10,
                      color: t.avgAttendanceRate >= 80 ? "#10b981" : t.avgAttendanceRate >= 60 ? "#f59e0b" : "#ef4444",
                    }))}
                    height={250}
                    valueSuffix="%"
                  />
                </div>
              </div>

              {/* Detailed Teacher Table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Teacher Details</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Teacher</th>
                        <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Hours</th>
                        <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Cost (EUR)</th>
                        <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Batches</th>
                        <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Students</th>
                        <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Attendance</th>
                        <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Churn</th>
                        <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Cost/Student</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherData.teachers.map((teacher) => (
                        <tr key={teacher.id} className="border-b border-gray-100 dark:border-gray-700/50">
                          <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">{teacher.name}</td>
                          <td className="py-3 px-2 text-right text-gray-600 dark:text-gray-300">{teacher.totalHours.toFixed(1)}</td>
                          <td className="py-3 px-2 text-right text-gray-600 dark:text-gray-300">{formatCurrency(teacher.totalCostEUR)}</td>
                          <td className="py-3 px-2 text-right text-gray-600 dark:text-gray-300">{teacher.batchCount}</td>
                          <td className="py-3 px-2 text-right text-gray-600 dark:text-gray-300">{teacher.studentCount}</td>
                          <td className="py-3 px-2 text-right">
                            <span className={teacher.avgAttendanceRate >= 80 ? "text-green-600 dark:text-green-400" : teacher.avgAttendanceRate >= 60 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}>
                              {teacher.avgAttendanceRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className={teacher.churnRate <= 5 ? "text-green-600 dark:text-green-400" : teacher.churnRate <= 15 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}>
                              {teacher.churnRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right text-gray-600 dark:text-gray-300">{formatCurrency(teacher.costPerStudent)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Failed to load teacher performance data.</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
