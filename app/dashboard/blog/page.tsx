"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"

type ApprovalStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED"

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
  approvalStatus: ApprovalStatus
  submittedAt: string | null
  submittedBy: string | null
  reviewedAt: string | null
  reviewedBy: string | null
  reviewNotes: string | null
  readerProfile: string
}

const PROFILE_OPTIONS = [
  "general",
  "nurse",
  "engineer",
  "it",
  "student",
  "visa-seeker",
] as const

const PROFILE_LABEL: Record<string, string> = {
  general: "General",
  nurse: "Nurse",
  engineer: "Engineer",
  it: "IT",
  student: "Student",
  "visa-seeker": "Visa seeker",
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

const APPROVAL_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All approval states" },
  { value: "PENDING_REVIEW", label: "Pending review" },
  { value: "DRAFT", label: "Drafts" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
]

const STATUS_BADGE: Record<ApprovalStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  PENDING_REVIEW:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  APPROVED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
}

const STATUS_LABEL: Record<ApprovalStatus, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
}

export default function BlogManagementPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role
  const isFounder = userRole === "FOUNDER"

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
  const [filterApproval, setFilterApproval] = useState<string>("all")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus === "published") params.set("published", "true")
      else if (filterStatus === "draft") params.set("published", "false")
      else params.set("published", "all")
      if (filterCategory !== "All") params.set("category", filterCategory)
      if (filterApproval !== "all") params.set("approvalStatus", filterApproval)
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
  }, [filterCategory, filterStatus, filterApproval, pagination.page])

  // Reset to page 1 whenever filters change so we don't land on an empty
  // page N of a smaller result set.
  useEffect(() => {
    setPagination((p) => (p.page === 1 ? p : { ...p, page: 1 }))
  }, [filterCategory, filterStatus, filterApproval])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const generatePost = async () => {
    setGenerating(true)
    try {
      const res = await fetch("/api/blog/generate", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        alert(`Draft generated: "${data.post.title}". Review and submit for approval.`)
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

  const patch = async (post: BlogPost, body: Record<string, unknown>, loadingKey: string) => {
    setActionLoading(loadingKey)
    try {
      const res = await fetch(`/api/blog/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        fetchPosts()
      } else {
        alert(`Failed: ${data.error || "unknown error"}`)
      }
    } catch (err) {
      console.error("PATCH failed:", err)
      alert("Request failed")
    } finally {
      setActionLoading(null)
    }
  }

  const submitForReview = (post: BlogPost) =>
    patch(post, { action: "submit" }, `submit-${post.id}`)

  const approve = (post: BlogPost) => {
    if (!isFounder) return
    patch(post, { action: "approve" }, `approve-${post.id}`)
  }

  const reject = (post: BlogPost) => {
    if (!isFounder) return
    const notes = prompt("Reason for rejection (optional):")
    if (notes === null) return
    patch(post, { action: "reject", reviewNotes: notes }, `reject-${post.id}`)
  }

  const togglePublish = (post: BlogPost) =>
    patch(post, { published: !post.published }, post.id)

  const toggleFeatured = (post: BlogPost) =>
    patch(post, { featured: !post.featured }, `feat-${post.id}`)

  const setReaderProfile = (post: BlogPost, profile: string) =>
    patch(post, { readerProfile: profile }, `prof-${post.id}`)

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

  const pendingCount = posts.filter((p) => p.approvalStatus === "PENDING_REVIEW").length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Blog Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {pagination.total} total posts
            {pendingCount > 0 && isFounder && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                · {pendingCount} awaiting your review
              </span>
            )}
          </p>
        </div>
        <button
          onClick={generatePost}
          disabled={generating}
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? "Generating draft…" : "Generate Draft Post"}
        </button>
      </div>

      {/* Approval workflow explainer */}
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 text-sm text-amber-900 dark:text-amber-200">
        <strong className="block mb-1">Approval workflow</strong>
        <ol className="list-decimal list-inside space-y-0.5 text-amber-800 dark:text-amber-300">
          <li>Drafts (cron-generated or manually created) start as <em>Draft</em> or <em>Pending review</em>.</li>
          <li>Marketing edits the draft and submits it for review.</li>
          <li>Founder reviews and either approves or rejects.</li>
          <li>Only <em>Approved</em> posts can be published.</li>
        </ol>
      </div>

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
          <option value="all">All publish states</option>
          <option value="published">Published</option>
          <option value="draft">Not published</option>
        </select>
        <select
          value={filterApproval}
          onChange={(e) => setFilterApproval(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
        >
          {APPROVAL_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No blog posts match these filters.
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
                    Funnel target
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Approval
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Live
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Published
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {posts.map((post) => {
                  const status: ApprovalStatus = post.approvalStatus || "DRAFT"
                  const isPending = status === "PENDING_REVIEW"
                  const isApproved = status === "APPROVED"
                  const isDraft = status === "DRAFT"
                  const isRejected = status === "REJECTED"

                  return (
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
                          {isRejected && post.reviewNotes && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1 truncate">
                              Rejected: {post.reviewNotes}
                            </p>
                          )}
                          {!isRejected &&
                            post.reviewNotes &&
                            post.reviewNotes.includes("[auto-validator:") && (
                              <p
                                className="text-xs text-amber-600 dark:text-amber-400 mt-1"
                                title={post.reviewNotes}
                              >
                                ⚠ Validator flagged {
                                  (post.reviewNotes.match(/\[auto-validator:/g) || [])
                                    .length
                                } issue(s)
                              </p>
                            )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {post.category}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={post.readerProfile || "general"}
                          disabled={actionLoading === `prof-${post.id}`}
                          onChange={(e) => setReaderProfile(post, e.target.value)}
                          className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                          title="Which audience this post converts for — drives the closing CTA on the live blog page"
                        >
                          {PROFILE_OPTIONS.map((p) => (
                            <option key={p} value={p}>
                              {PROFILE_LABEL[p]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_BADGE[status]}`}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {post.published ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Live
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs text-gray-500">
                            Not live
                          </span>
                        )}
                        {post.featured && (
                          <span className="ml-1 inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            Featured
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">
                        {formatDate(post.publishedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {(isDraft || isRejected) && (
                            <button
                              onClick={() => submitForReview(post)}
                              disabled={actionLoading === `submit-${post.id}`}
                              className="px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded hover:bg-amber-200 disabled:opacity-50"
                            >
                              Submit for review
                            </button>
                          )}
                          {isPending && isFounder && (
                            <>
                              <button
                                onClick={() => approve(post)}
                                disabled={actionLoading === `approve-${post.id}`}
                                className="px-2 py-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded hover:bg-emerald-200 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => reject(post)}
                                disabled={actionLoading === `reject-${post.id}`}
                                className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {isApproved && (
                            <button
                              onClick={() => togglePublish(post)}
                              disabled={actionLoading === post.id}
                              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                            >
                              {actionLoading === post.id
                                ? "..."
                                : post.published
                                ? "Unpublish"
                                : "Publish"}
                            </button>
                          )}
                          <button
                            onClick={() => toggleFeatured(post)}
                            disabled={actionLoading === `feat-${post.id}`}
                            className={`px-2 py-1 text-xs rounded disabled:opacity-50 ${
                              post.featured
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                            } hover:bg-gray-200 dark:hover:bg-gray-600`}
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
                          {isFounder && (
                            <button
                              onClick={() => deletePost(post)}
                              disabled={actionLoading === `del-${post.id}`}
                              className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-800/30 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

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
