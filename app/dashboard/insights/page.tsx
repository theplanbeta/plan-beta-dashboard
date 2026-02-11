"use client"

import { useState, useEffect } from "react"
import { formatCurrency } from "@/lib/utils"
import LineChart from "@/components/charts/LineChart"
import BarChart from "@/components/charts/BarChart"
import DonutChart from "@/components/charts/DonutChart"

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

const CATEGORY_COLORS: Record<string, string> = {
  INFRASTRUCTURE: "#3b82f6",
  TOOLS_SOFTWARE: "#8b5cf6",
  MARKETING: "#f59e0b",
  ADMINISTRATIVE: "#10b981",
  OTHER: "#6b7280",
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("30")
  const [activeTab, setActiveTab] = useState<"overview" | "batches" | "pnl">("overview")
  const [batchData, setBatchData] = useState<BatchProfitabilityData | null>(null)
  const [batchLoading, setBatchLoading] = useState(false)

  useEffect(() => {
    fetchInsights()
  }, [period])

  useEffect(() => {
    if (activeTab === "batches" && !batchData) {
      fetchBatchProfitability()
    }
  }, [activeTab])

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
      const res = await fetch("/api/analytics/batch-profitability")
      const result = await res.json()
      setBatchData(result)
    } catch (error) {
      console.error("Error fetching batch profitability:", error)
    } finally {
      setBatchLoading(false)
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

        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="180">Last 6 months</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6">
          {[
            { key: "overview" as const, label: "Overview" },
            { key: "batches" as const, label: "Batch Profitability" },
            { key: "pnl" as const, label: "P&L Breakdown" },
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
          <div className="text-sm text-gray-600 dark:text-gray-400">Satisfaction</div>
          <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
            {data.kpis.customerSatisfaction.toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Avg attendance</div>
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
    </div>
  )
}
