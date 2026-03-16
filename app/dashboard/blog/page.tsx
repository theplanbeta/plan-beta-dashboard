"use client"

import { useState, useEffect, useCallback } from "react"

interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  category: string
  tags: string[]
  readTime: number
  published: boolean
  featured: boolean
  publishedAt: string | null
  author: string
  createdAt: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

const CATEGORIES = [
  "All",
  "Career",
  "Learning Tips",
  "Exam Prep",
  "Visa & Immigration",
  "Student Life",
  "Job Market",
]

export default function BlogManagementPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [filterCategory, setFilterCategory] = useState("All")
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft">("all")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus === "published") params.set("published", "true")
      else if (filterStatus === "draft") params.set("published", "false")
      else params.set("published", "all")
      if (filterCategory !== "All") params.set("category", filterCategory)
      params.set("limit", "20")
      params.set("page", pagination.page.toString())

      const res = await fetch(`/api/blog?${params}`)
      const data = await res.json()
      setPosts(data.posts || [])
      setPagination(data.pagination || pagination)
    } catch (err) {
      console.error("Failed to fetch posts:", err)
    } finally {
      setLoading(false)
    }
  }, [filterCategory, filterStatus, pagination.page])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const generatePost = async () => {
    setGenerating(true)
    try {
      const res = await fetch("/api/blog/generate", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        alert(`Blog post generated: "${data.post.title}"`)
        fetchPosts()
      } else {
        alert(`Generation failed: ${data.error}`)
      }
    } catch (err) {
      console.error("Failed to generate post:", err)
      alert("Failed to generate blog post")
    } finally {
      setGenerating(false)
    }
  }

  const togglePublish = async (post: BlogPost) => {
    setActionLoading(post.id)
    try {
      const res = await fetch(`/api/blog/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !post.published }),
      })
      const data = await res.json()
      if (data.success) {
        fetchPosts()
      } else {
        alert(`Failed: ${data.error}`)
      }
    } catch (err) {
      console.error("Failed to toggle publish:", err)
    } finally {
      setActionLoading(null)
    }
  }

  const toggleFeatured = async (post: BlogPost) => {
    setActionLoading(`feat-${post.id}`)
    try {
      const res = await fetch(`/api/blog/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: !post.featured }),
      })
      const data = await res.json()
      if (data.success) {
        fetchPosts()
      }
    } catch (err) {
      console.error("Failed to toggle featured:", err)
    } finally {
      setActionLoading(null)
    }
  }

  const deletePost = async (post: BlogPost) => {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return
    setActionLoading(`del-${post.id}`)
    try {
      const res = await fetch(`/api/blog/${post.id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        fetchPosts()
      } else {
        alert(`Failed: ${data.error}`)
      }
    } catch (err) {
      console.error("Failed to delete post:", err)
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Blog Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {pagination.total} total posts
          </p>
        </div>
        <button
          onClick={generatePost}
          disabled={generating}
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Generate New Post
            </>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(e.target.value as "all" | "published" | "draft")
          }
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
      </div>

      {/* Posts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No blog posts found. Click &quot;Generate New Post&quot; to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Published
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Read Time
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {posts.map((post) => (
                  <tr
                    key={post.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  >
                    <td className="px-4 py-3">
                      <div className="max-w-xs">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {post.title}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
                          /{post.slug}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {post.category}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          post.published
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}
                      >
                        {post.published ? "Published" : "Draft"}
                      </span>
                      {post.featured && (
                        <span className="ml-1 inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          Featured
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">
                      {formatDate(post.publishedAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {post.readTime} min
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => togglePublish(post)}
                          disabled={actionLoading === post.id}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                          title={
                            post.published ? "Unpublish" : "Publish"
                          }
                        >
                          {actionLoading === post.id
                            ? "..."
                            : post.published
                            ? "Unpublish"
                            : "Publish"}
                        </button>
                        <button
                          onClick={() => toggleFeatured(post)}
                          disabled={actionLoading === `feat-${post.id}`}
                          className={`px-2 py-1 text-xs rounded disabled:opacity-50 ${
                            post.featured
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                          } hover:bg-gray-200 dark:hover:bg-gray-600`}
                          title={
                            post.featured ? "Unfeature" : "Feature"
                          }
                        >
                          {post.featured ? "Unfeature" : "Feature"}
                        </button>
                        {post.published && (
                          <a
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                          >
                            View
                          </a>
                        )}
                        <button
                          onClick={() => deletePost(post)}
                          disabled={
                            actionLoading === `del-${post.id}`
                          }
                          className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-800/30 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total}{" "}
              posts)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page - 1 }))
                }
                disabled={pagination.page <= 1}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page + 1 }))
                }
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
