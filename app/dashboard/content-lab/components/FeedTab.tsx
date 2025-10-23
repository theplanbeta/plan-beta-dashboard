"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/components/Toast"

type RedditPost = {
  id: string
  redditId: string
  title: string
  selftext: string | null
  url: string
  permalink: string
  upvotes: number
  numComments: number
  postedAt: string
  subredditName: string
  analyzed: boolean
  saved: boolean
  subreddit: {
    name: string
    category: string | null
  }
  contentIdeas: Array<{ id: string; status: string }>
}

export default function FeedTab() {
  const [posts, setPosts] = useState<RedditPost[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [filter, setFilter] = useState("")
  const { addToast } = useToast()

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/reddit/fetch")
      const data = await res.json()
      setPosts(data)
    } catch (error) {
      console.error("Error loading posts:", error)
      addToast("Failed to load posts", { type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleFetchPosts = async () => {
    setFetching(true)
    try {
      const res = await fetch("/api/reddit/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 25 }),
      })

      if (!res.ok) throw new Error("Failed to fetch posts")

      const data = await res.json()
      addToast(`Fetched posts from ${data.results?.length || 0} subreddits!`, {
        type: "success",
      })
      loadPosts()
    } catch (error) {
      addToast("Failed to fetch posts from Reddit", { type: "error" })
    } finally {
      setFetching(false)
    }
  }

  const handleGenerateIdea = async (postId: string) => {
    setAnalyzing(postId)
    try {
      const res = await fetch("/api/reddit/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      addToast("Content idea generated! Check the Ideas tab.", {
        type: "success",
      })
      loadPosts()
    } catch (error: any) {
      addToast(error.message || "Failed to generate content idea", {
        type: "error",
      })
    } finally {
      setAnalyzing(null)
    }
  }

  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(filter.toLowerCase()) ||
      post.subredditName.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search posts..."
          className="input flex-1 max-w-md"
        />
        <button
          onClick={handleFetchPosts}
          disabled={fetching}
          className="btn-primary whitespace-nowrap"
        >
          {fetching ? "Fetching..." : "Fetch New Posts"}
        </button>
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="text-center py-12">Loading posts...</div>
      ) : filteredPosts.length === 0 ? (
        <div className="panel p-12 text-center">
          <p className="text-gray-600 dark:text-gray-300">
            No posts yet. Click "Fetch New Posts" to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div key={post.id} className="panel p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      r/{post.subredditName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {post.upvotes} upvotes • {post.numComments} comments
                    </span>
                  </div>

                  <a
                    href={post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-semibold text-foreground hover:text-primary dark:hover:text-red-400 transition-colors"
                  >
                    {post.title}
                  </a>

                  {post.selftext && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                      {post.selftext.slice(0, 200)}...
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    {post.contentIdeas.length > 0 ? (
                      <span className="text-xs px-2 py-1 rounded bg-success/10 text-success dark:bg-green-900/30 dark:text-green-400">
                        {post.contentIdeas.length} idea(s) generated
                      </span>
                    ) : null}
                  </div>
                </div>

                <button
                  onClick={() => handleGenerateIdea(post.id)}
                  disabled={analyzing === post.id}
                  className="btn-primary whitespace-nowrap"
                >
                  {analyzing === post.id ? "Generating..." : "Generate Idea"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
