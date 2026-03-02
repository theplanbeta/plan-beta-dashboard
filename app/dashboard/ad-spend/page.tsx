"use client"

import { useState, useEffect, useCallback } from "react"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/components/Toast"

type AdSpendRecord = {
  id: string
  platform: string
  campaignName: string
  date: string
  spend: number
  currency: string
  eurEquivalent: number | null
  impressions: number
  clicks: number
  notes: string | null
  createdAt: string
}

type Summary = {
  totalSpendEur: number
  totalImpressions: number
  totalClicks: number
  avgCpc: number
}

const PLATFORMS = [
  { value: "META_ADS", label: "Meta Ads" },
  { value: "GOOGLE", label: "Google" },
  { value: "INSTAGRAM", label: "Instagram" },
]

const PLATFORM_LABELS: Record<string, string> = {
  META_ADS: "Meta Ads",
  GOOGLE: "Google",
  INSTAGRAM: "Instagram",
}

const emptyForm = {
  platform: "META_ADS",
  campaignName: "",
  date: new Date().toISOString().split("T")[0],
  spend: "",
  currency: "EUR" as "EUR" | "INR",
  impressions: "",
  clicks: "",
  notes: "",
}

export default function AdSpendPage() {
  const [records, setRecords] = useState<AdSpendRecord[]>([])
  const [summary, setSummary] = useState<Summary>({
    totalSpendEur: 0,
    totalImpressions: 0,
    totalClicks: 0,
    avgCpc: 0,
  })
  const [loading, setLoading] = useState(true)
  const [filterPlatform, setFilterPlatform] = useState("")
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const { addToast } = useToast()

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterPlatform) params.set("platform", filterPlatform)
      if (filterStartDate) params.set("startDate", filterStartDate)
      if (filterEndDate) params.set("endDate", filterEndDate)

      const res = await fetch(`/api/analytics/ad-spend?${params}`)
      if (res.ok) {
        const data = await res.json()
        const items: AdSpendRecord[] = Array.isArray(data) ? data : data.records || []
        setRecords(items)

        // Compute summary from data
        const totalSpendEur = items.reduce(
          (sum: number, r: AdSpendRecord) => sum + (r.eurEquivalent ?? r.spend),
          0
        )
        const totalImpressions = items.reduce(
          (sum: number, r: AdSpendRecord) => sum + r.impressions,
          0
        )
        const totalClicks = items.reduce(
          (sum: number, r: AdSpendRecord) => sum + r.clicks,
          0
        )
        const avgCpc = totalClicks > 0 ? totalSpendEur / totalClicks : 0

        setSummary({ totalSpendEur, totalImpressions, totalClicks, avgCpc })
      }
    } catch (error) {
      console.error("Error fetching ad spend:", error)
    } finally {
      setLoading(false)
    }
  }, [filterPlatform, filterStartDate, filterEndDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openAdd = () => {
    setFormData(emptyForm)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      ...formData,
      spend: parseFloat(formData.spend),
      impressions: parseInt(formData.impressions, 10) || 0,
      clicks: parseInt(formData.clicks, 10) || 0,
    }

    try {
      const res = await fetch("/api/analytics/ad-spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        addToast(data?.error || "Failed to save record", { type: "error" })
        return
      }

      addToast("Ad spend record added", { type: "success" })
      setShowForm(false)
      fetchData()
    } catch {
      addToast("Failed to save record", { type: "error" })
    } finally {
      setSaving(false)
    }
  }

  const computeCtr = (impressions: number, clicks: number) => {
    if (impressions === 0) return "0.00"
    return ((clicks / impressions) * 100).toFixed(2)
  }

  const computeCpc = (spend: number, clicks: number) => {
    if (clicks === 0) return "—"
    return (spend / clicks).toFixed(2)
  }

  // Sort records by date descending
  const sortedRecords = [...records].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ad Spend Management</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Track advertising spend across platforms
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary px-4 py-2 rounded-md text-white">
          Add Record
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="panel p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Spend (EUR)</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {formatCurrency(summary.totalSpendEur, "EUR")}
          </div>
        </div>
        <div className="panel p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Impressions</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {summary.totalImpressions.toLocaleString()}
          </div>
        </div>
        <div className="panel p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Clicks</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {summary.totalClicks.toLocaleString()}
          </div>
        </div>
        <div className="panel p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg CPC</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {summary.avgCpc > 0 ? formatCurrency(summary.avgCpc, "EUR") : "—"}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="panel p-4 flex flex-wrap gap-4 items-center">
        <div>
          <label className="form-label">Platform</label>
          <select
            className="select"
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
          >
            <option value="">All Platforms</option>
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Start Date</label>
          <input
            type="date"
            className="input"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="form-label">End Date</label>
          <input
            type="date"
            className="input"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="panel overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : sortedRecords.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No ad spend records found. Click &ldquo;Add Record&rdquo; to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                  Date
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                  Platform
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                  Campaign
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                  Spend
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                  Currency
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                  Impressions
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                  Clicks
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                  CTR
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                  CPC
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {new Date(record.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {PLATFORM_LABELS[record.platform] || record.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground font-medium">
                    {record.campaignName}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {formatCurrency(
                      Number(record.spend),
                      record.currency as "EUR" | "INR"
                    )}
                    {record.currency === "INR" && record.eurEquivalent && (
                      <span className="block text-xs text-gray-500">
                        ({formatCurrency(Number(record.eurEquivalent), "EUR")})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {record.currency}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {record.impressions.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {record.clicks.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {computeCtr(record.impressions, record.clicks)}%
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {computeCpc(record.spend, record.clicks)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                    {record.notes || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Record Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Add Ad Spend Record</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">
                    Platform <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="select"
                    value={formData.platform}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, platform: e.target.value }))
                    }
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, date: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">
                  Campaign Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.campaignName}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, campaignName: e.target.value }))
                  }
                  placeholder="e.g., Nursing Germany - March 2026"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Currency</label>
                  <select
                    className="select"
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        currency: e.target.value as "EUR" | "INR",
                      }))
                    }
                  >
                    <option value="EUR">EUR</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">
                    Spend ({formData.currency === "EUR" ? "\u20ac" : "\u20b9"}){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={formData.spend}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, spend: e.target.value }))
                    }
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Impressions</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.impressions}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, impressions: e.target.value }))
                    }
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="form-label">Clicks</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.clicks}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, clicks: e.target.value }))
                    }
                    min="0"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Notes</label>
                <textarea
                  className="input"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary px-4 py-2 rounded-md text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Add Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
