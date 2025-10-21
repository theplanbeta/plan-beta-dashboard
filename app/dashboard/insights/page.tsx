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
      paid: number
      unpaid: number
      daily: Array<{ date: string; cost: number }>
      avgDaily: number
      projected: number
    }
    total: number
  }
  profitability: {
    gross: number
    margin: number
    projected: number
    projectedMargin: number
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
    projectedProfitMargin: number
  }
  recommendations: Array<{
    type: string
    title: string
    message: string
    action: string
  }>
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("30")

  useEffect(() => {
    fetchInsights()
  }, [period])

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</div>
            <div className="text-2xl font-bold text-success mt-1">
              {formatCurrency(data.revenue.total, 'INR')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Period total</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Teacher Costs</div>
            <div className="text-2xl font-bold text-error mt-1">
              {formatCurrency(data.costs.teachers.total, 'INR')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Approved hours</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Gross Profit</div>
            <div className={`text-2xl font-bold mt-1 ${data.profitability.gross >= 0 ? "text-success" : "text-error"}`}>
              {formatCurrency(data.profitability.gross, 'INR')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Revenue - costs</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Profit Margin</div>
            <div className={`text-2xl font-bold mt-1 ${data.profitability.margin >= 0 ? "text-success" : "text-error"}`}>
              {data.profitability.margin.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Actual margin</div>
          </div>
        </div>
      </div>

      {/* Revenue Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Trend</h2>
          <LineChart
            data={data.revenue.daily.map((d) => ({ date: d.date, value: d.revenue }))}
            color="#10b981"
            valuePrefix="₹"
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue by Type</h2>
          <BarChart
            data={Object.entries(data.revenue.byType).map(([label, value]) => ({
              label: label.replace(/_/g, " "),
              value,
              color: "#3b82f6",
            }))}
            valuePrefix="₹"
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div>
            <div className="text-sm opacity-90 text-white">Revenue</div>
            <div className="text-2xl font-bold mt-1 text-white">
              {formatCurrency(data.forecasts.nextMonthRevenue, 'INR')}
            </div>
          </div>
          <div>
            <div className="text-sm opacity-90 text-white">Teacher Costs</div>
            <div className="text-2xl font-bold mt-1 text-white">
              {formatCurrency(data.forecasts.projectedTeacherCosts, 'INR')}
            </div>
          </div>
          <div>
            <div className="text-sm opacity-90 text-white">Projected Profit</div>
            <div className="text-2xl font-bold mt-1 text-white">
              {formatCurrency(data.forecasts.projectedProfit, 'INR')}
            </div>
            <div className="text-xs opacity-75 text-white mt-1">
              {data.forecasts.projectedProfitMargin.toFixed(1)}% margin
            </div>
          </div>
          <div>
            <div className="text-sm opacity-90 text-white">New Enrollments</div>
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
    </div>
  )
}
