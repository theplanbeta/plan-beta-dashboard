"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/components/Toast"

type ContentIdea = {
  id: string
  hook: string
  script: string
  visualSuggestions: string
  caption: string
  hashtags: string[]
  topic: string
  status: string
  notes: string | null
  createdAt: string
  redditPost: {
    id: string
    title: string
    upvotes: number
    subredditName: string
    permalink: string
  }
}

export default function IdeasTab() {
  const [ideas, setIdeas] = useState<ContentIdea[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIdea, setSelectedIdea] = useState<ContentIdea | null>(null)
  const [statusFilter, setStatusFilter] = useState("")
  const { addToast } = useToast()

  useEffect(() => {
    loadIdeas()
  }, [statusFilter])

  const loadIdeas = async () => {
    try {
      const params = statusFilter ? `?status=${statusFilter}` : ""
      const res = await fetch(`/api/content-ideas${params}`)
      const data = await res.json()
      setIdeas(data)
    } catch (error) {
      console.error("Error loading ideas:", error)
      addToast("Failed to load ideas", { type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/content-ideas?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      addToast("Status updated!", { type: "success" })
      loadIdeas()
    } catch (error) {
      addToast("Failed to update status", { type: "error" })
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    addToast(`${label} copied to clipboard!`, { type: "success" })
  }

  if (loading) {
    return <div className="text-center py-12">Loading ideas...</div>
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="select"
        >
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="USED">Used</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Ideas List */}
      {ideas.length === 0 ? (
        <div className="panel p-12 text-center">
          <p className="text-gray-600 dark:text-gray-300">
            No ideas yet. Go to the Feed tab and generate some!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className="panel p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedIdea(idea)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-1 rounded bg-info/10 text-info dark:bg-blue-900/30 dark:text-blue-400">
                      {idea.topic}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      idea.status === 'USED'
                        ? 'bg-success/10 text-success dark:bg-green-900/30 dark:text-green-400'
                        : idea.status === 'ARCHIVED'
                        ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        : 'bg-warning/10 text-warning dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {idea.status}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground text-lg">
                    {idea.hook}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    From: r/{idea.redditPost.subredditName} • {idea.redditPost.upvotes} upvotes
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                {idea.script.slice(0, 150)}...
              </p>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUpdateStatus(idea.id, 'USED')
                  }}
                  className="text-xs px-3 py-1 rounded bg-success/10 text-success hover:bg-success/20 dark:bg-green-900/30 dark:text-green-400"
                >
                  Mark as Used
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUpdateStatus(idea.id, 'ARCHIVED')
                  }}
                  className="text-xs px-3 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400"
                >
                  Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Idea Detail Modal */}
      {selectedIdea && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedIdea(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Content Idea</h2>
              <button
                onClick={() => setSelectedIdea(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Source */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Source</h3>
                <a
                  href={selectedIdea.redditPost.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {selectedIdea.redditPost.title}
                </a>
              </div>

              {/* Hook */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Hook</h3>
                  <button
                    onClick={() => copyToClipboard(selectedIdea.hook, "Hook")}
                    className="text-xs text-primary hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-foreground font-medium">{selectedIdea.hook}</p>
              </div>

              {/* Script */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Reel Script</h3>
                  <button
                    onClick={() => copyToClipboard(selectedIdea.script, "Script")}
                    className="text-xs text-primary hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {selectedIdea.script}
                </p>
              </div>

              {/* Visual Suggestions */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Visual Suggestions</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedIdea.visualSuggestions}</p>
              </div>

              {/* Caption */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Caption</h3>
                  <button
                    onClick={() => copyToClipboard(selectedIdea.caption, "Caption")}
                    className="text-xs text-primary hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedIdea.caption}</p>
              </div>

              {/* Hashtags */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Hashtags</h3>
                  <button
                    onClick={() =>
                      copyToClipboard(selectedIdea.hashtags.map((h) => `#${h}`).join(" "), "Hashtags")
                    }
                    className="text-xs text-primary hover:underline"
                  >
                    Copy All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedIdea.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
