"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/components/Toast"

type Subreddit = {
  id: string
  name: string
  description: string | null
  category: string | null
  active: boolean
  lastFetched: string | null
  postCount: number
  _count?: {
    posts: number
  }
}

export default function SubredditsTab() {
  const [subreddits, setSubreddits] = useState<Subreddit[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newSubreddit, setNewSubreddit] = useState("")
  const [category, setCategory] = useState("")
  const { addToast } = useToast()

  useEffect(() => {
    fetchSubreddits()
  }, [])

  const fetchSubreddits = async () => {
    try {
      const res = await fetch("/api/subreddits")
      const data = await res.json()
      setSubreddits(data)
    } catch (error) {
      console.error("Error fetching subreddits:", error)
      addToast("Failed to load subreddits", { type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubreddit.trim()) return

    setAdding(true)
    try {
      const res = await fetch("/api/subreddits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSubreddit, category }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      addToast("Subreddit added successfully!", { type: "success" })
      setNewSubreddit("")
      setCategory("")
      fetchSubreddits()
    } catch (error: any) {
      addToast(error.message || "Failed to add subreddit", { type: "error" })
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subreddit?")) return

    try {
      await fetch(`/api/subreddits?id=${id}`, { method: "DELETE" })
      addToast("Subreddit deleted", { type: "success" })
      fetchSubreddits()
    } catch (error) {
      addToast("Failed to delete subreddit", { type: "error" })
    }
  }

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/subreddits?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      })
      fetchSubreddits()
    } catch (error) {
      addToast("Failed to update subreddit", { type: "error" })
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Add Subreddit Form */}
      <div className="panel p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Add Subreddit</h2>
        <form onSubmit={handleAdd} className="flex gap-4">
          <input
            type="text"
            value={newSubreddit}
            onChange={(e) => setNewSubreddit(e.target.value)}
            placeholder="Enter subreddit name (e.g. germany or r/germany)"
            className="input flex-1"
            disabled={adding}
          />
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (optional)"
            className="input w-48"
            disabled={adding}
          />
          <button
            type="submit"
            disabled={adding || !newSubreddit.trim()}
            className="btn-primary"
          >
            {adding ? "Adding..." : "Add"}
          </button>
        </form>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Suggested: germany, AskAGerman, German, expats, IWantOut, Berlin, Munich
        </p>
      </div>

      {/* Subreddits List */}
      <div className="panel overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-foreground">Your Subreddits</h2>
        </div>

        {subreddits.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            No subreddits added yet. Add one above to get started!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Subreddit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Posts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Last Fetched
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {subreddits.map((sub) => (
                  <tr key={sub.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <a
                          href={`https://reddit.com/r/${sub.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          r/{sub.name}
                        </a>
                      </div>
                      {sub.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {sub.description.slice(0, 60)}...
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {sub.category || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {sub._count?.posts || sub.postCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {sub.lastFetched
                        ? new Date(sub.lastFetched).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(sub.id, sub.active)}
                        className={`px-2 py-1 rounded text-xs ${
                          sub.active
                            ? "bg-success/10 text-success dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {sub.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDelete(sub.id)}
                        className="text-error hover:text-error/80 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
