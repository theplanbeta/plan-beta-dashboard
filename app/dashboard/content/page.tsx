"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface ContentPerformance {
  id: string
  platform: string
  contentType: string
  contentId: string
  contentUrl: string
  publishedAt: string
  caption: string | null
  hashtags: string[]
  topic: string | null
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  engagementRate: number | null
  createdAt: string
}

export default function ContentPage() {
  const { data: session } = useSession()
  const [content, setContent] = useState<ContentPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'REEL' | 'POST'>('all')
  const [topicFilter, setTopicFilter] = useState<string>('all')

  useEffect(() => {
    fetchContent()
  }, [])

  const fetchContent = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/content')
      if (!response.ok) throw new Error('Failed to fetch content')
      const data = await response.json()
      setContent(data.content || [])
    } catch (error) {
      console.error('Error fetching content:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredContent = content.filter(item => {
    if (filter !== 'all' && item.contentType !== filter) return false
    if (topicFilter !== 'all' && item.topic !== topicFilter) return false
    return true
  })

  const topics = Array.from(new Set(content.map(item => item.topic).filter(Boolean)))

  const stats = {
    total: content.length,
    totalViews: content.reduce((sum, item) => sum + item.views, 0),
    totalLikes: content.reduce((sum, item) => sum + item.likes, 0),
    totalComments: content.reduce((sum, item) => sum + item.comments, 0),
    avgEngagement: content.length > 0
      ? (content.reduce((sum, item) => sum + (item.engagementRate || 0), 0) / content.length).toFixed(2)
      : 0,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading content...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Content Performance</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track Instagram reels and posts performance with real-time metrics
          </p>
        </div>
        <button
          onClick={fetchContent}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Total Content</p>
          <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Total Views</p>
          <p className="text-2xl font-bold text-foreground mt-1">{stats.totalViews.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Total Likes</p>
          <p className="text-2xl font-bold text-foreground mt-1">{stats.totalLikes.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Total Comments</p>
          <p className="text-2xl font-bold text-foreground mt-1">{stats.totalComments.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Avg Engagement</p>
          <p className="text-2xl font-bold text-foreground mt-1">{stats.avgEngagement}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('REEL')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === 'REEL'
                ? 'bg-primary text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
            }`}
          >
            Reels
          </button>
          <button
            onClick={() => setFilter('POST')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === 'POST'
                ? 'bg-primary text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
            }`}
          >
            Posts
          </button>
        </div>

        {topics.length > 0 && (
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600"
          >
            <option value="all">All Topics</option>
            {topics.map(topic => (
              <option key={topic} value={topic!}>{topic}</option>
            ))}
          </select>
        )}
      </div>

      {/* Content List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Content</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Topic</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Views</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Likes</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Comments</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Engagement</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredContent.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No content found. Sync Instagram content from the Calendar page.
                  </td>
                </tr>
              ) : (
                filteredContent.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="px-4 py-3">
                      <a
                        href={item.contentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline max-w-xs block truncate"
                      >
                        {item.caption || 'No caption'}
                      </a>
                      {item.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.hashtags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="text-xs text-gray-500 dark:text-gray-400">
                              #{tag}
                            </span>
                          ))}
                          {item.hashtags.length > 3 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              +{item.hashtags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        item.contentType === 'REEL'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                      }`}>
                        {item.contentType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {item.topic || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      {item.views.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      {item.likes.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      {item.comments.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      {item.engagementRate ? `${item.engagementRate}%` : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(item.publishedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
