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
        return "text-red-600 bg-red-50"
      case "ERROR":
        return "text-orange-600 bg-orange-50"
      case "WARNING":
        return "text-yellow-600 bg-yellow-50"
      default:
        return "text-blue-600 bg-blue-50"
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
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">System Activity</h1>
        <p className="text-gray-600">Real-time monitoring of all system operations</p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Events (24h)</div>
            <div className="text-2xl font-bold">{stats.totalLogs}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Errors</div>
            <div className="text-2xl font-bold text-orange-600">{stats.errorCount}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Critical</div>
            <div className="text-2xl font-bold text-red-600">{stats.criticalCount}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Warnings</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.warningCount}</div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setView("all")}
            className={`px-4 py-2 rounded ${
              view === "all" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
            }`}
          >
            All Activity
          </button>
          <button
            onClick={() => setView("errors")}
            className={`px-4 py-2 rounded ${
              view === "errors" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700"
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
          <span className="text-sm text-gray-600">Auto-refresh (10s)</span>
        </label>
      </div>

      {/* Activity Log */}
      <div className="bg-white rounded-lg shadow">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No activity logs found</div>
        ) : (
          <div className="divide-y">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50">
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
                        <span className="text-xs text-gray-500">{log.action}</span>
                        {log.entityType && (
                          <span className="text-xs text-gray-400">
                            {log.entityType}
                            {log.entityId && ` #${log.entityId.slice(0, 8)}`}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 mb-2">{log.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {log.userEmail && (
                          <span>
                            👤 {log.userName || log.userEmail}
                          </span>
                        )}
                        {log.ipAddress && <span>🌐 {log.ipAddress}</span>}
                        <span>🕐 {formatDate(log.createdAt)}</span>
                      </div>
                      {log.errorMessage && (
                        <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
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
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top Actions (24h)</h3>
          <div className="space-y-2">
            {stats.topActions.map((action, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-700">{action.action}</span>
                <span className="text-sm font-medium text-gray-900">{action.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
