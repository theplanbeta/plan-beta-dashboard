"use client"

import { useState, useEffect } from "react"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/components/Toast"
import { parseZodIssues } from "@/lib/form-errors"

type Expense = {
  id: string
  name: string
  amount: number
  currency: string
  eurEquivalent: number | null
  category: string
  type: string
  date: string
  notes: string | null
  isActive: boolean
  createdAt: string
}

type Summary = {
  totalExpenses: number
  byCategory: Record<string, number>
  recurring: { monthlyTotal: number; count: number }
  oneTime: { total: number; count: number }
}

const CATEGORIES = [
  { value: "INFRASTRUCTURE", label: "Infrastructure" },
  { value: "TOOLS_SOFTWARE", label: "Tools / Software" },
  { value: "MARKETING", label: "Marketing" },
  { value: "ADMINISTRATIVE", label: "Administrative" },
  { value: "OTHER", label: "Other" },
]

const CATEGORY_LABELS: Record<string, string> = {
  INFRASTRUCTURE: "Infrastructure",
  TOOLS_SOFTWARE: "Tools / Software",
  MARKETING: "Marketing",
  ADMINISTRATIVE: "Administrative",
  OTHER: "Other",
}

const emptyForm = {
  name: "",
  amount: "",
  currency: "EUR" as "EUR" | "INR",
  category: "INFRASTRUCTURE",
  type: "RECURRING" as "RECURRING" | "ONE_TIME",
  date: new Date().toISOString().split("T")[0],
  notes: "",
  isActive: true,
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState("")
  const [filterType, setFilterType] = useState("")
  const { addToast } = useToast()

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchData()
  }, [filterCategory, filterType])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterCategory) params.set("category", filterCategory)
      if (filterType) params.set("type", filterType)

      const [expRes, sumRes] = await Promise.all([
        fetch(`/api/expenses?${params}`),
        fetch("/api/expenses/summary"),
      ])

      if (expRes.ok) setExpenses(await expRes.json())
      if (sumRes.ok) setSummary(await sumRes.json())
    } catch (error) {
      console.error("Error fetching expenses:", error)
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditingId(null)
    setFormData(emptyForm)
    setFieldErrors({})
    setShowModal(true)
  }

  const openEdit = (expense: Expense) => {
    setEditingId(expense.id)
    setFormData({
      name: expense.name,
      amount: String(expense.amount),
      currency: expense.currency as "EUR" | "INR",
      category: expense.category,
      type: expense.type as "RECURRING" | "ONE_TIME",
      date: new Date(expense.date).toISOString().split("T")[0],
      notes: expense.notes || "",
      isActive: expense.isActive,
    })
    setFieldErrors({})
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFieldErrors({})

    const payload = {
      ...formData,
      amount: parseFloat(formData.amount),
    }

    try {
      const url = editingId ? `/api/expenses/${editingId}` : "/api/expenses"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        if (Array.isArray(data?.details)) {
          setFieldErrors(parseZodIssues(data.details))
        }
        addToast(data?.error || "Failed to save expense", { type: "error" })
        return
      }

      addToast(editingId ? "Expense updated" : "Expense added", { type: "success" })
      setShowModal(false)
      fetchData()
    } catch {
      addToast("Failed to save expense", { type: "error" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return

    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" })
      if (res.ok) {
        addToast("Expense deleted", { type: "success" })
        fetchData()
      } else {
        addToast("Failed to delete", { type: "error" })
      }
    } catch {
      addToast("Failed to delete", { type: "error" })
    }
  }

  const handleToggleActive = async (expense: Expense) => {
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !expense.isActive }),
      })
      if (res.ok) {
        addToast(expense.isActive ? "Expense paused" : "Expense activated", { type: "success" })
        fetchData()
      }
    } catch {
      addToast("Failed to update", { type: "error" })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Expenses</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Track operating costs and recurring expenses</p>
        </div>
        <button onClick={openAdd} className="btn-primary px-4 py-2 rounded-md text-white">
          Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="panel p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Monthly Recurring</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {formatCurrency(summary.recurring.monthlyTotal, "EUR")}
            </div>
            <div className="text-xs text-gray-500 mt-1">{summary.recurring.count} active items</div>
          </div>
          <div className="panel p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">One-Time (This Month)</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {formatCurrency(summary.oneTime.total, "EUR")}
            </div>
            <div className="text-xs text-gray-500 mt-1">{summary.oneTime.count} items</div>
          </div>
          <div className="panel p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total This Month</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {formatCurrency(summary.totalExpenses, "EUR")}
            </div>
          </div>
          <div className="panel p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Top Category</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {Object.entries(summary.byCategory).sort(([, a], [, b]) => b - a)[0]
                ? CATEGORY_LABELS[Object.entries(summary.byCategory).sort(([, a], [, b]) => b - a)[0][0]] || "—"
                : "—"}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {Object.entries(summary.byCategory).sort(([, a], [, b]) => b - a)[0]
                ? formatCurrency(Object.entries(summary.byCategory).sort(([, a], [, b]) => b - a)[0][1], "EUR")
                : ""}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="panel p-4 flex flex-wrap gap-4 items-center">
        <div>
          <label className="form-label">Category</label>
          <select
            className="select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Type</label>
          <select
            className="select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="RECURRING">Recurring</option>
            <option value="ONE_TIME">One-Time</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="panel overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No expenses found. Click &ldquo;Add Expense&rdquo; to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Name</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Date</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Active</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-foreground font-medium">
                    {expense.name}
                    {expense.notes && (
                      <span className="block text-xs text-gray-500 mt-0.5">{expense.notes}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {formatCurrency(Number(expense.amount), expense.currency as "EUR" | "INR")}
                    {expense.currency === "INR" && expense.eurEquivalent && (
                      <span className="block text-xs text-gray-500">
                        ({formatCurrency(Number(expense.eurEquivalent), "EUR")})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {CATEGORY_LABELS[expense.category] || expense.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      expense.type === "RECURRING"
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                    }`}>
                      {expense.type === "RECURRING" ? "Recurring" : "One-Time"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {new Date(expense.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {expense.type === "RECURRING" ? (
                      <button
                        onClick={() => handleToggleActive(expense)}
                        className={`w-8 h-4 rounded-full relative transition-colors ${
                          expense.isActive ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      >
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                          expense.isActive ? "left-4" : "left-0.5"
                        }`} />
                      </button>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(expense)}
                      className="text-primary hover:text-primary/80 mr-3 text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="text-red-600 hover:text-red-800 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">
              {editingId ? "Edit Expense" : "Add Expense"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={`input ${fieldErrors.name ? "border-red-500" : ""}`}
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Vercel Pro Plan"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Currency</label>
                  <select
                    className="select"
                    value={formData.currency}
                    onChange={(e) => setFormData((f) => ({ ...f, currency: e.target.value as "EUR" | "INR" }))}
                  >
                    <option value="EUR">EUR</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">
                    Amount ({formData.currency === "EUR" ? "\u20ac" : "\u20b9"}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    className={`input ${fieldErrors.amount ? "border-red-500" : ""}`}
                    value={formData.amount}
                    onChange={(e) => setFormData((f) => ({ ...f, amount: e.target.value }))}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Category</label>
                  <select
                    className="select"
                    value={formData.category}
                    onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Type</label>
                  <select
                    className="select"
                    value={formData.type}
                    onChange={(e) => setFormData((f) => ({ ...f, type: e.target.value as "RECURRING" | "ONE_TIME" }))}
                  >
                    <option value="RECURRING">Recurring (Monthly)</option>
                    <option value="ONE_TIME">One-Time</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.date}
                    onChange={(e) => setFormData((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>
                {formData.type === "RECURRING" && (
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData((f) => ({ ...f, isActive: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-foreground">Active</span>
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="form-label">Notes</label>
                <textarea
                  className="input"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary px-4 py-2 rounded-md text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Update" : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
