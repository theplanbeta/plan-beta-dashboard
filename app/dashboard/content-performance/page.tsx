"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ContentPerformance {
  id: string
  platform: string
  contentType: string
  contentId: string
  contentUrl: string
  publishedAt: string
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  leadsGenerated: number
  enrollments: number
  revenue: number
  caption: string | null
  hashtags: string[]
  topic: string | null
  engagementRate: number | null
  conversionRate: number | null
  roi: number | null
}

interface ContentStats {
  totalContent: number
  totalViews: number
  totalEngagements: number
  totalLeads: number
  totalEnrollments: number
  totalRevenue: number
  avgEngagementRate: number
}

export default function ContentPerformancePage() {
  const router = useRouter()
  const [content, setContent] = useState<ContentPerformance[]>([])
  const [stats, setStats] = useState<ContentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    platform: 'all',
    contentType: 'all',
    topic: 'all',
    sortBy: 'publishedAt' as 'publishedAt' | 'views' | 'engagementRate' | 'leadsGenerated',
    sortOrder: 'desc' as 'asc' | 'desc',
  })

  useEffect(() => {
    fetchContent()
  }, [filter])

  const fetchContent = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (filter.platform !== 'all') params.append('platform', filter.platform)
      if (filter.contentType !== 'all') params.append('contentType', filter.contentType)
      if (filter.topic !== 'all') params.append('topic', filter.topic)
      params.append('sortBy', filter.sortBy)
      params.append('sortOrder', filter.sortOrder)

      const response = await fetch(`/api/content?${params.toString()}`)
      const data = await response.json()

      setContent(data.content || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error('Error fetching content:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTopicBadgeColor = (topic: string | null) => {
    const colors: Record<string, string> = {
      grammar_tips: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      student_success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      batch_promo: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      german_culture: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
      vocabulary: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      general: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    }
    return colors[topic || 'general'] || colors.general
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading content performance...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="mb-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to Calendar
        </button>

        <h1 className="text-3xl font-bold text-foreground">📊 Content Performance</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Track Instagram reels, posts, and their impact on lead generation
        </p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <p className="text-xs text-gray-600 dark:text-gray-400 uppercase">Total Content</p>
            <p className="text-2xl font-bold text-foreground">{stats.totalContent}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <p className="text-xs text-gray-600 dark:text-gray-400 uppercase">Total Views</p>
            <p className="text-2xl font-bold text-foreground">{stats.totalViews.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <p className="text-xs text-gray-600 dark:text-gray-400 uppercase">Engagements</p>
            <p className="text-2xl font-bold text-foreground">{stats.totalEngagements.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <p className="text-xs text-gray-600 dark:text-gray-400 uppercase">Leads</p>
            <p className="text-2xl font-bold text-green-600">{stats.totalLeads}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <p className="text-xs text-gray-600 dark:text-gray-400 uppercase">Enrollments</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalEnrollments}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <p className="text-xs text-gray-600 dark:text-gray-400 uppercase">Avg Engagement</p>
            <p className="text-2xl font-bold text-purple-600">{stats.avgEngagementRate.toFixed(2)}%</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Platform
            </label>
            <select
              value={filter.platform}
              onChange={(e) => setFilter({ ...filter, platform: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-foreground text-sm"
            >
              <option value="all">All Platforms</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="YOUTUBE">YouTube</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Content Type
            </label>
            <select
              value={filter.contentType}
              onChange={(e) => setFilter({ ...filter, contentType: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-foreground text-sm"
            >
              <option value="all">All Types</option>
              <option value="REEL">Reels</option>
              <option value="POST">Posts</option>
              <option value="STORY">Stories</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Topic
            </label>
            <select
              value={filter.topic}
              onChange={(e) => setFilter({ ...filter, topic: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-foreground text-sm"
            >
              <option value="all">All Topics</option>
              <option value="grammar_tips">Grammar Tips</option>
              <option value="student_success">Student Success</option>
              <option value="batch_promo">Batch Promo</option>
              <option value="german_culture">German Culture</option>
              <option value="vocabulary">Vocabulary</option>
              <option value="general">General</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sort By
            </label>
            <select
              value={filter.sortBy}
              onChange={(e) => setFilter({ ...filter, sortBy: e.target.value as any })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-foreground text-sm"
            >
              <option value="publishedAt">Date Published</option>
              <option value="views">Views</option>
              <option value="engagementRate">Engagement Rate</option>
              <option value="leadsGenerated">Leads Generated</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Order
            </label>
            <select
              value={filter.sortOrder}
              onChange={(e) => setFilter({ ...filter, sortOrder: e.target.value as any })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-foreground text-sm"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content List */}
      {content.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center shadow">
          <p className="text-gray-600 dark:text-gray-400 mb-4">No content found. Start by syncing your Instagram content!</p>
          <button
            onClick={() => router.push('/dashboard/calendar')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Calendar
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {content.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-xs font-medium rounded">
                      {item.platform}
                    </span>
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300 text-xs font-medium rounded">
                      {item.contentType}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getTopicBadgeColor(item.topic)}`}>
                      {item.topic?.replace('_', ' ').toUpperCase() || 'GENERAL'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    {item.caption ? item.caption.substring(0, 150) + '...' : 'No caption'}
                  </p>

                  {item.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.hashtags.slice(0, 5).map((tag, idx) => (
                        <span key={idx} className="text-xs text-blue-600 dark:text-blue-400">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Published: {new Date(item.publishedAt).toLocaleDateString()}
                  </p>
                </div>

                <a
                  href={item.contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  View Post →
                </a>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-4 md:grid-cols-8 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Views</p>
                  <p className="text-lg font-bold text-foreground">{item.views.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Likes</p>
                  <p className="text-lg font-bold text-foreground">{item.likes.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Comments</p>
                  <p className="text-lg font-bold text-foreground">{item.comments}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Shares</p>
                  <p className="text-lg font-bold text-foreground">{item.shares}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Engagement</p>
                  <p className="text-lg font-bold text-purple-600">{item.engagementRate?.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Leads</p>
                  <p className="text-lg font-bold text-green-600">{item.leadsGenerated}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Enrollments</p>
                  <p className="text-lg font-bold text-blue-600">{item.enrollments}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">ROI</p>
                  <p className="text-lg font-bold text-orange-600">
                    {item.roi ? `${item.roi.toFixed(0)}%` : '-'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
