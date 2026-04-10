"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import LineChart from "@/components/charts/LineChart"
import DonutChart from "@/components/charts/DonutChart"
import PeriodSelector from "@/components/charts/PeriodSelector"

type InstagramPost = {
  id: string
  shortCode: string
  type: string
  caption: string | null
  permalink: string | null
  thumbnailUrl: string | null
  likesCount: number
  commentsCount: number
  videoPlayCount: number | null
  hashtags: string[]
  mentions: string[]
  isPinned: boolean
  ownerUsername: string
  publishedAt: string
}

type Snapshot = {
  followersCount: number
  followingCount: number
  postsCount: number
  biography: string | null
  scrapedAt: string
}

type ApiResponse = {
  posts: InstagramPost[]
  total: number
  snapshot: Snapshot | null
}

type SortField = "likesCount" | "commentsCount" | "videoPlayCount" | "publishedAt"

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const TYPE_COLORS: Record<string, string> = {
  Image: "#3b82f6",
  Video: "#8b5cf6",
  Sidecar: "#f59e0b",
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return n.toLocaleString()
}

function truncate(s: string | null, max: number): string {
  if (!s) return ""
  return s.length > max ? s.slice(0, max) + "..." : s
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default function InstagramContentPage() {
  const { data: session } = useSession()
  const [period, setPeriod] = useState(90)
  const [posts, setPosts] = useState<InstagramPost[]>([])
  const [allPosts, setAllPosts] = useState<InstagramPost[]>([])
  const [total, setTotal] = useState(0)
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState("")

  // Table state
  const [tablePage, setTablePage] = useState(0)
  const [tableSort, setTableSort] = useState<SortField>("publishedAt")
  const [tableSortDir, setTableSortDir] = useState<"asc" | "desc">("desc")
  const PAGE_SIZE = 20

  // Fetch all posts for analysis (up to 200)
  const fetchPosts = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/instagram/posts?period=${period}&sort=date&limit=200&offset=0`)
      const data: ApiResponse = await res.json()
      setAllPosts(data.posts || [])
      setPosts(data.posts || [])
      setTotal(data.total)
      setSnapshot(data.snapshot)
    } catch (error) {
      console.error("Error fetching Instagram posts:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
    setTablePage(0)
  }, [period])

  // Computed metrics
  const avgLikes = useMemo(() => {
    if (posts.length === 0) return 0
    return Math.round(posts.reduce((s, p) => s + p.likesCount, 0) / posts.length)
  }, [posts])

  const avgComments = useMemo(() => {
    if (posts.length === 0) return 0
    return Math.round(posts.reduce((s, p) => s + p.commentsCount, 0) / posts.length)
  }, [posts])

  // Top 5 posts by likes
  const topPosts = useMemo(() => {
    return [...posts].sort((a, b) => b.likesCount - a.likesCount).slice(0, 5)
  }, [posts])

  // Content type breakdown
  const typeBreakdown = useMemo(() => {
    const byType: Record<string, { count: number; likes: number; comments: number; views: number }> = {}
    for (const p of posts) {
      const t = p.type || "Image"
      if (!byType[t]) byType[t] = { count: 0, likes: 0, comments: 0, views: 0 }
      byType[t].count++
      byType[t].likes += p.likesCount
      byType[t].comments += p.commentsCount
      byType[t].views += p.videoPlayCount || 0
    }
    return byType
  }, [posts])

  const donutData = useMemo(() => {
    return Object.entries(typeBreakdown).map(([label, data]) => ({
      label,
      value: data.count,
      color: TYPE_COLORS[label] || "#6b7280",
    }))
  }, [typeBreakdown])

  // Engagement timeline (chronological)
  const timelineData = useMemo(() => {
    return [...posts]
      .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
      .map((p) => ({
        date: new Date(p.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        value: p.likesCount,
      }))
  }, [posts])

  // Sorted + paginated posts for table
  const sortedPosts = useMemo(() => {
    const sorted = [...posts].sort((a, b) => {
      let aVal: number, bVal: number
      if (tableSort === "publishedAt") {
        aVal = new Date(a.publishedAt).getTime()
        bVal = new Date(b.publishedAt).getTime()
      } else if (tableSort === "videoPlayCount") {
        aVal = a.videoPlayCount || 0
        bVal = b.videoPlayCount || 0
      } else {
        aVal = a[tableSort]
        bVal = b[tableSort]
      }
      return tableSortDir === "desc" ? bVal - aVal : aVal - bVal
    })
    return sorted
  }, [posts, tableSort, tableSortDir])

  const paginatedPosts = useMemo(() => {
    const start = tablePage * PAGE_SIZE
    return sortedPosts.slice(start, start + PAGE_SIZE)
  }, [sortedPosts, tablePage])

  const totalPages = Math.ceil(sortedPosts.length / PAGE_SIZE)

  // Content Insights
  const insights = useMemo(() => {
    if (posts.length === 0) return null

    // Best posting day
    const dayEngagement: Record<number, { total: number; count: number }> = {}
    for (const p of posts) {
      const day = new Date(p.publishedAt).getDay()
      if (!dayEngagement[day]) dayEngagement[day] = { total: 0, count: 0 }
      dayEngagement[day].total += p.likesCount + p.commentsCount
      dayEngagement[day].count++
    }
    let bestDay = 0
    let bestDayAvg = 0
    for (const [day, data] of Object.entries(dayEngagement)) {
      const avg = data.total / data.count
      if (avg > bestDayAvg) {
        bestDayAvg = avg
        bestDay = parseInt(day)
      }
    }

    // Best posting time (hour)
    const hourEngagement: Record<number, { total: number; count: number }> = {}
    for (const p of posts) {
      const hour = new Date(p.publishedAt).getHours()
      if (!hourEngagement[hour]) hourEngagement[hour] = { total: 0, count: 0 }
      hourEngagement[hour].total += p.likesCount + p.commentsCount
      hourEngagement[hour].count++
    }
    let bestHour = 0
    let bestHourAvg = 0
    for (const [hour, data] of Object.entries(hourEngagement)) {
      const avg = data.total / data.count
      if (avg > bestHourAvg) {
        bestHourAvg = avg
        bestHour = parseInt(hour)
      }
    }

    // Top hashtags from top 20% posts
    const sortedByLikes = [...posts].sort((a, b) => b.likesCount - a.likesCount)
    const top20Percent = sortedByLikes.slice(0, Math.max(1, Math.floor(posts.length * 0.2)))
    const hashtagCounts: Record<string, number> = {}
    for (const p of top20Percent) {
      for (const h of (p.hashtags || [])) {
        hashtagCounts[h] = (hashtagCounts[h] || 0) + 1
      }
    }
    const topHashtags = Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag)

    // Best content type
    let bestType = "Image"
    let bestTypeAvg = 0
    for (const [type, data] of Object.entries(typeBreakdown)) {
      const avg = (data.likes + data.comments) / data.count
      if (avg > bestTypeAvg) {
        bestTypeAvg = avg
        bestType = type
      }
    }

    return {
      bestDay: DAYS_OF_WEEK[bestDay],
      bestDayAvg: Math.round(bestDayAvg),
      bestHour: `${bestHour.toString().padStart(2, "0")}:00`,
      bestHourAvg: Math.round(bestHourAvg),
      topHashtags,
      bestType,
      bestTypeAvg: Math.round(bestTypeAvg),
    }
  }, [posts, typeBreakdown])

  const handleSort = (field: SortField) => {
    if (tableSort === field) {
      setTableSortDir(tableSortDir === "desc" ? "asc" : "desc")
    } else {
      setTableSort(field)
      setTableSortDir("desc")
    }
    setTablePage(0)
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncMessage("")
    try {
      const res = await fetch("/api/instagram/sync", { method: "POST" })
      if (res.ok) {
        setSyncMessage("Sync triggered successfully")
        // Refresh data after a short delay
        setTimeout(() => {
          fetchPosts()
          setSyncMessage("")
        }, 3000)
      } else {
        setSyncMessage("Sync failed")
        setTimeout(() => setSyncMessage(""), 3000)
      }
    } catch {
      setSyncMessage("Sync failed")
      setTimeout(() => setSyncMessage(""), 3000)
    } finally {
      setSyncing(false)
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (tableSort !== field) return <span className="text-gray-300 dark:text-gray-600 ml-1">&#8597;</span>
    return <span className="ml-1">{tableSortDir === "desc" ? "\u2193" : "\u2191"}</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading content performance...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Content Performance</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">@learn.german.with.aparnabose</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <PeriodSelector
            value={period}
            onChange={(days) => setPeriod(days || 365)}
          />
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
          >
            {syncing ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync Now
              </>
            )}
          </button>
        </div>
      </div>
      {syncMessage && (
        <p className="text-sm text-green-600 dark:text-green-400">{syncMessage}</p>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Followers</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {snapshot ? formatNumber(snapshot.followersCount) : "--"}
          </p>
          {snapshot && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              as of {formatDate(snapshot.scrapedAt)}
            </p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Posts</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {snapshot ? formatNumber(snapshot.postsCount) : "--"}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {total} in selected period
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Likes</p>
          <p className="text-2xl font-bold text-pink-600 dark:text-pink-400 mt-1">
            {formatNumber(avgLikes)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">per post in period</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Comments</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {formatNumber(avgComments)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">per post in period</p>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Performers</h2>
        {topPosts.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No posts in this period</p>
        ) : (
          <div className="space-y-4">
            {topPosts.map((post, i) => (
              <div
                key={post.id}
                className="flex items-start gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-lg font-bold text-gray-400 dark:text-gray-500 w-6 text-center mt-1">
                  {i + 1}
                </span>
                {post.thumbnailUrl ? (
                  <img
                    src={post.thumbnailUrl}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{post.type}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                    {truncate(post.caption, 100)}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-pink-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                      {formatNumber(post.likesCount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z" /></svg>
                      {formatNumber(post.commentsCount)}
                    </span>
                    {post.videoPlayCount != null && post.videoPlayCount > 0 && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-purple-500" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        {formatNumber(post.videoPlayCount)}
                      </span>
                    )}
                    <span className="text-gray-400">{formatDate(post.publishedAt)}</span>
                  </div>
                </div>
                {post.permalink && (
                  <a
                    href={post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                    title="View on Instagram"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content Type Breakdown + Engagement Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content Type Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content Type Breakdown</h2>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-48">
              <DonutChart data={donutData} size={180} />
            </div>
            <div className="flex-1 w-full">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium text-right">Posts</th>
                    <th className="pb-2 font-medium text-right">Avg Likes</th>
                    <th className="pb-2 font-medium text-right">Avg Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(typeBreakdown).map(([type, data]) => (
                    <tr key={type} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-2">
                        <span className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full inline-block"
                            style={{ backgroundColor: TYPE_COLORS[type] || "#6b7280" }}
                          />
                          <span className="text-gray-900 dark:text-white">{type}</span>
                        </span>
                      </td>
                      <td className="py-2 text-right text-gray-700 dark:text-gray-300">{data.count}</td>
                      <td className="py-2 text-right text-gray-700 dark:text-gray-300">
                        {Math.round(data.likes / data.count)}
                      </td>
                      <td className="py-2 text-right text-gray-700 dark:text-gray-300">
                        {Math.round(data.comments / data.count)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Engagement Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Engagement Timeline</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Likes per post over time</p>
          <LineChart data={timelineData} color="#8b5cf6" height={220} />
        </div>
      </div>

      {/* All Posts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Posts</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{sortedPosts.length} posts</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th
                  className="pb-3 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  onClick={() => handleSort("publishedAt")}
                >
                  Date <SortIcon field="publishedAt" />
                </th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Caption</th>
                <th
                  className="pb-3 font-medium text-right cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  onClick={() => handleSort("likesCount")}
                >
                  Likes <SortIcon field="likesCount" />
                </th>
                <th
                  className="pb-3 font-medium text-right cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  onClick={() => handleSort("commentsCount")}
                >
                  Comments <SortIcon field="commentsCount" />
                </th>
                <th
                  className="pb-3 font-medium text-right cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  onClick={() => handleSort("videoPlayCount")}
                >
                  Views <SortIcon field="videoPlayCount" />
                </th>
                <th className="pb-3 font-medium text-right">Link</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPosts.map((post) => (
                <tr key={post.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {formatDate(post.publishedAt)}
                  </td>
                  <td className="py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: TYPE_COLORS[post.type] || "#6b7280" }}
                    >
                      {post.type}
                    </span>
                  </td>
                  <td className="py-3 text-gray-700 dark:text-gray-300 max-w-xs truncate">
                    {truncate(post.caption, 80)}
                  </td>
                  <td className="py-3 text-right text-gray-700 dark:text-gray-300 font-medium">
                    {formatNumber(post.likesCount)}
                  </td>
                  <td className="py-3 text-right text-gray-700 dark:text-gray-300 font-medium">
                    {formatNumber(post.commentsCount)}
                  </td>
                  <td className="py-3 text-right text-gray-700 dark:text-gray-300 font-medium">
                    {post.videoPlayCount ? formatNumber(post.videoPlayCount) : "--"}
                  </td>
                  <td className="py-3 text-right">
                    {post.permalink && (
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                      >
                        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setTablePage(Math.max(0, tablePage - 1))}
              disabled={tablePage === 0}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {tablePage + 1} of {totalPages}
            </span>
            <button
              onClick={() => setTablePage(Math.min(totalPages - 1, tablePage + 1))}
              disabled={tablePage >= totalPages - 1}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Content Insights */}
      {insights && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content Insights</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">Best Posting Day</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{insights.bestDay}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Avg {formatNumber(insights.bestDayAvg)} engagement
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Best Posting Time</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{insights.bestHour}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Avg {formatNumber(insights.bestHourAvg)} engagement
              </p>
            </div>
            <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-4 border border-pink-200 dark:border-pink-800">
              <p className="text-xs font-medium text-pink-600 dark:text-pink-400 uppercase tracking-wide">Top Hashtags</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {insights.topHashtags.length > 0 ? (
                  insights.topHashtags.map((tag) => (
                    <span key={tag} className="text-xs bg-pink-100 dark:bg-pink-800/40 text-pink-700 dark:text-pink-300 px-2 py-0.5 rounded-full">
                      #{tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-500 dark:text-gray-400">No hashtag data</span>
                )}
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">Content That Converts</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{insights.bestType}s</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Avg {formatNumber(insights.bestTypeAvg)} engagement per post
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
