"use client"

import { useState, useEffect, useCallback } from "react"

interface User {
  id: string
  name: string
}

interface ActionItem {
  id: string
  title: string
  description: string | null
  source: string
  category: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  status: "TODO" | "IN_PROGRESS" | "DONE"
  dueDate: string | null
  completedAt: string | null
  createdAt: string
  createdBy: User
  assignedTo: User | null
}

const CATEGORIES = ["General", "Marketing", "Operations", "Finance", "Content", "Growth", "Technical"]

const CATEGORY_COLORS: Record<string, string> = {
  General: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  Marketing: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  Operations: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300",
  Finance: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  Content: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300",
  Growth: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  Technical: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
  MEDIUM: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  HIGH: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  URGENT: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
}

const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
}

const TABS = ["all", "TODO", "IN_PROGRESS", "DONE"] as const

export default function TasksPage() {
  const [items, setItems] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [users, setUsers] = useState<User[]>([])

  // New task form
  const [newTitle, setNewTitle] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newCategory, setNewCategory] = useState("General")
  const [newPriority, setNewPriority] = useState<string>("MEDIUM")
  const [newDueDate, setNewDueDate] = useState("")
  const [newAssignee, setNewAssignee] = useState("")
  const [creating, setCreating] = useState(false)

  const fetchItems = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filter !== "all") params.set("status", filter)
      if (categoryFilter !== "all") params.set("category", categoryFilter)
      const url = `/api/action-items${params.toString() ? `?${params}` : ""}`
      const res = await fetch(url)
      if (res.ok) setItems(await res.json())
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [filter, categoryFilter])

  useEffect(() => { fetchItems() }, [fetchItems])

  // Fetch users for assignee dropdown
  useEffect(() => {
    fetch("/api/users")
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : data.users || []
        setUsers(list.filter((u: { active: boolean }) => u.active))
      })
      .catch(() => {})
  }, [])

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
    if (res.ok) setItems(prev => prev.filter(item => item.id !== id))
  }

  const createItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          category: newCategory,
          priority: newPriority,
          dueDate: newDueDate ? new Date(newDueDate).toISOString() : null,
          assignedToId: newAssignee || null,
        }),
      })
      if (res.ok) {
        const item = await res.json()
        setItems(prev => [item, ...prev])
        setNewTitle("")
        setNewDescription("")
        setNewCategory("General")
        setNewPriority("MEDIUM")
        setNewDueDate("")
        setNewAssignee("")
        setShowForm(false)
      }
    } catch {
      // silent
    } finally {
      setCreating(false)
    }
  }

  const counts = {
    all: items.length,
    TODO: items.filter(i => i.status === "TODO").length,
    IN_PROGRESS: items.filter(i => i.status === "IN_PROGRESS").length,
    DONE: items.filter(i => i.status === "DONE").length,
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tasks</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track action items from CFO insights, marketing, and operations
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add Task
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={createItem} className="mb-6 p-4 border border-gray-200 dark:border-white/[0.06] rounded-lg bg-white dark:bg-white/[0.02]">
          <div className="space-y-3">
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Task title..."
              autoFocus
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/[0.1] rounded-lg bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50"
            />
            <textarea
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/[0.1] rounded-lg bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 resize-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50"
            />
            <div className="flex flex-wrap gap-3">
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="text-sm px-2 py-1.5 border border-gray-200 dark:border-white/[0.1] rounded-lg bg-transparent text-gray-700 dark:text-gray-300"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={newPriority}
                onChange={e => setNewPriority(e.target.value)}
                className="text-sm px-2 py-1.5 border border-gray-200 dark:border-white/[0.1] rounded-lg bg-transparent text-gray-700 dark:text-gray-300"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
              <input
                type="date"
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
                className="text-sm px-2 py-1.5 border border-gray-200 dark:border-white/[0.1] rounded-lg bg-transparent text-gray-700 dark:text-gray-300"
              />
              {users.length > 0 && (
                <select
                  value={newAssignee}
                  onChange={e => setNewAssignee(e.target.value)}
                  className="text-sm px-2 py-1.5 border border-gray-200 dark:border-white/[0.1] rounded-lg bg-transparent text-gray-700 dark:text-gray-300"
                >
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!newTitle.trim() || creating}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {creating ? "Adding..." : "Add Task"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-1 bg-gray-100 dark:bg-white/[0.05] rounded-lg p-1 flex-1">
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
        <select
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setLoading(true) }}
          className="text-sm px-3 py-1.5 border border-gray-200 dark:border-white/[0.1] rounded-lg bg-white dark:bg-white/[0.05] text-gray-700 dark:text-gray-300"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 dark:text-gray-500 text-sm">No tasks yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            Add tasks manually or save insights from the CFO chat
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
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
                    <span className={`text-sm font-medium ${
                      item.status === "DONE"
                        ? "line-through text-gray-400 dark:text-gray-500"
                        : "text-gray-900 dark:text-white"
                    }`}>
                      {item.title}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS.General}`}>
                      {item.category}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLORS[item.priority]}`}>
                      {item.priority}
                    </span>
                    {item.status === "IN_PROGRESS" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        In Progress
                      </span>
                    )}
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400 dark:text-gray-500 flex-wrap">
                    {item.source !== "Manual" && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{item.source}</span>
                    )}
                    {item.assignedTo && (
                      <span>{item.assignedTo.name}</span>
                    )}
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    {item.dueDate && (
                      <span className={new Date(item.dueDate) < new Date() && item.status !== "DONE" ? "text-red-500 font-medium" : ""}>
                        Due: {new Date(item.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {item.completedAt && (
                      <span className="text-emerald-500">Done {new Date(item.completedAt).toLocaleDateString()}</span>
                    )}
                  </div>

                  {/* Description */}
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
                    onChange={e => updateItem(item.id, { status: e.target.value })}
                    className="text-[11px] bg-transparent border border-gray-200 dark:border-white/[0.1] rounded px-1 py-0.5 text-gray-600 dark:text-gray-400 cursor-pointer"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                  <select
                    value={item.category}
                    onChange={e => updateItem(item.id, { category: e.target.value })}
                    className="text-[11px] bg-transparent border border-gray-200 dark:border-white/[0.1] rounded px-1 py-0.5 text-gray-600 dark:text-gray-400 cursor-pointer hidden sm:block"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
