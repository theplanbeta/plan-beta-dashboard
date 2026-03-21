"use client"

import { useState, useEffect, useCallback } from "react"

interface ActionItem {
  id: string
  title: string
  description: string | null
  source: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  status: "TODO" | "IN_PROGRESS" | "DONE"
  dueDate: string | null
  createdAt: string
  createdBy: { name: string }
}

const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
  MEDIUM: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  HIGH: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  URGENT: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
}

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  IN_PROGRESS: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  DONE: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
}

const TABS = ["all", "TODO", "IN_PROGRESS", "DONE"] as const

export default function ActionItemsPage() {
  const [items, setItems] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    try {
      const url = filter === "all" ? "/api/action-items" : `/api/action-items?status=${filter}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setItems(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const updateItem = async (id: string, updates: Record<string, unknown>) => {
    const res = await fetch(`/api/action-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    if (res.ok) {
      const updated = await res.json()
      setItems(prev => prev.map(item => item.id === id ? { ...item, ...updated } : item))
    }
  }

  const deleteItem = async (id: string) => {
    const res = await fetch(`/api/action-items/${id}`, { method: "DELETE" })
    if (res.ok) {
      setItems(prev => prev.filter(item => item.id !== id))
    }
  }

  const counts = {
    all: items.length,
    TODO: items.filter(i => i.status === "TODO").length,
    IN_PROGRESS: items.filter(i => i.status === "IN_PROGRESS").length,
    DONE: items.filter(i => i.status === "DONE").length,
  }

  // Re-count after filter changes since we fetch filtered data
  const filteredItems = items

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Action Items</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Tasks from CFO insights and analysis
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-white/[0.05] rounded-lg p-1">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => { setFilter(tab); setLoading(true) }}
            className={`flex-1 text-sm px-3 py-1.5 rounded-md transition-colors ${
              filter === tab
                ? "bg-white dark:bg-white/[0.1] text-gray-900 dark:text-white font-medium shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab === "all" ? "All" : STATUS_LABELS[tab]}
            {filter === "all" && <span className="ml-1 text-xs opacity-60">({counts[tab]})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 dark:text-gray-500 text-sm">No action items yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            Save actionable insights from your CFO chat to track them here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className={`border rounded-lg transition-all ${
                item.status === "DONE"
                  ? "border-gray-100 dark:border-white/[0.04] bg-gray-50/50 dark:bg-white/[0.01] opacity-60"
                  : "border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]"
              }`}
            >
              <div className="flex items-start gap-3 p-3 sm:p-4">
                {/* Checkbox */}
                <button
                  onClick={() => updateItem(item.id, {
                    status: item.status === "DONE" ? "TODO" : "DONE"
                  })}
                  className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    item.status === "DONE"
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-gray-300 dark:border-gray-600 hover:border-emerald-500"
                  }`}
                >
                  {item.status === "DONE" && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-medium ${
                        item.status === "DONE"
                          ? "line-through text-gray-400 dark:text-gray-500"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLORS[item.priority]}`}>
                      {item.priority}
                    </span>
                    {item.status === "IN_PROGRESS" && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS.IN_PROGRESS}`}>
                        In Progress
                      </span>
                    )}
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">{item.source}</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    {item.dueDate && (
                      <span className={new Date(item.dueDate) < new Date() && item.status !== "DONE" ? "text-red-500" : ""}>
                        Due: {new Date(item.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Description (expandable) */}
                  {item.description && (
                    <button
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-1"
                    >
                      {expandedId === item.id ? "Hide details" : "Show details"}
                    </button>
                  )}
                  {expandedId === item.id && item.description && (
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap bg-gray-50 dark:bg-white/[0.03] rounded p-3 max-h-60 overflow-y-auto">
                      {item.description}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <select
                    value={item.status}
                    onChange={(e) => updateItem(item.id, { status: e.target.value })}
                    className="text-[11px] bg-transparent border border-gray-200 dark:border-white/[0.1] rounded px-1 py-0.5 text-gray-600 dark:text-gray-400 cursor-pointer"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                  <select
                    value={item.priority}
                    onChange={(e) => updateItem(item.id, { priority: e.target.value })}
                    className="text-[11px] bg-transparent border border-gray-200 dark:border-white/[0.1] rounded px-1 py-0.5 text-gray-600 dark:text-gray-400 cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
