"use client"

import { useState, useEffect } from "react"
import { formatDate } from "@/lib/utils"

type AuditLog = {
  id: string
  action: string
  severity: string
  description: string
  userId: string | null
  userEmail: string | null
  userName: string | null
  entityType: string | null
  entityId: string | null
  createdAt: string
  ipAddress: string | null
  errorMessage: string | null
}

type SystemStats = {
  totalLogs: number
  errorCount: number
  warningCount: number
  criticalCount: number
  topActions: Array<{ action: string; count: number }>
}

export default function ActivityClient() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"all" | "errors">("all")
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    fetchLogs()
    fetchStats()

    // Auto-refresh every 10 seconds if enabled
    const interval = autoRefresh
      ? setInterval(() => {
          fetchLogs()
          fetchStats()
        }, 10000)
      : undefined

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [view, autoRefresh])

  async function fetchLogs() {
    try {
      const type = view === "errors" ? "errors" : "all"
      const response = await fetch(`/api/system/audit-logs?type=${type}&limit=50`)
      const data = await response.json()
      setLogs(data.logs || [])
    } catch (error) {
      console.error("Failed to fetch logs:", error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStats() {
    try {
      const response = await fetch("/api/system/audit-logs?type=stats")
      const data = await response.json()
      setStats(data.stats || null)
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  function getSeverityColor(severity: string) {
    switch (severity) {
      case "CRITICAL":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30"
      case "ERROR":
        return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30"
      case "WARNING":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30"
      default:
        return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
    }
  }

  function getSeverityIcon(severity: string) {
    switch (severity) {
      case "CRITICAL":
        return "🚨"
      case "ERROR":
        return "❌"
      case "WARNING":
        return "⚠️"
      default:
        return "ℹ️"
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 dark:text-white">System Activity</h1>
        <p className="text-gray-600 dark:text-gray-400">Real-time monitoring of all system operations</p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Events (24h)</div>
            <div className="text-2xl font-bold dark:text-white">{stats.totalLogs}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Errors</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.errorCount}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Critical</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.criticalCount}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Warnings</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.warningCount}</div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setView("all")}
            className={`px-4 py-2 rounded ${
              view === "all"
                ? "bg-blue-600 dark:bg-blue-500 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            All Activity
          </button>
          <button
            onClick={() => setView("errors")}
            className={`px-4 py-2 rounded ${
              view === "errors"
                ? "bg-red-600 dark:bg-red-500 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            Errors Only
          </button>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">Auto-refresh (10s)</span>
        </label>
      </div>

      {/* Activity Log */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No activity logs found</div>
        ) : (
          <div className="divide-y dark:divide-gray-700">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-2xl">{getSeverityIcon(log.severity)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(
                            log.severity
                          )}`}
                        >
                          {log.severity}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{log.action}</span>
                        {log.entityType && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {log.entityType}
                            {log.entityId && ` #${log.entityId.slice(0, 8)}`}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 dark:text-gray-100 mb-2">{log.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        {log.userEmail && (
                          <span>
                            👤 {log.userName || log.userEmail}
                          </span>
                        )}
                        {log.ipAddress && <span>🌐 {log.ipAddress}</span>}
                        <span>🕐 {formatDate(log.createdAt)}</span>
                      </div>
                      {log.errorMessage && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/30 rounded text-xs text-red-700 dark:text-red-400">
                          {log.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Actions */}
      {stats && stats.topActions.length > 0 && (
        <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Top Actions (24h)</h3>
          <div className="space-y-2">
            {stats.topActions.map((action, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-700 dark:text-gray-300">{action.action}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{action.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
