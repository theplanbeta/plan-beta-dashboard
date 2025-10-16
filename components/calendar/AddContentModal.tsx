"use client"

import { useState } from 'react'
import { toast } from 'react-hot-toast'

interface AddContentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddContentModal({ isOpen, onClose, onSuccess }: AddContentModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    platform: 'INSTAGRAM',
    contentType: 'REEL',
    contentUrl: '',
    publishedAt: new Date().toISOString().slice(0, 16),
    caption: '',
    views: '',
    likes: '',
    comments: '',
    shares: '',
    saves: '',
    topic: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Extract content ID from URL
      const contentId = extractContentIdFromUrl(formData.contentUrl, formData.platform)

      if (!contentId) {
        toast.error('Invalid content URL. Please check the URL and try again.')
        setLoading(false)
        return
      }

      const payload = {
        platform: formData.platform,
        contentType: formData.contentType,
        contentId,
        contentUrl: formData.contentUrl,
        publishedAt: new Date(formData.publishedAt).toISOString(),
        caption: formData.caption || undefined,
        views: formData.views ? parseInt(formData.views) : undefined,
        likes: formData.likes ? parseInt(formData.likes) : undefined,
        comments: formData.comments ? parseInt(formData.comments) : undefined,
        shares: formData.shares ? parseInt(formData.shares) : undefined,
        saves: formData.saves ? parseInt(formData.saves) : undefined,
        topic: formData.topic || undefined,
      }

      const response = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add content')
      }

      toast.success('Content added successfully!')
      onSuccess()
      handleClose()
    } catch (error: any) {
      console.error('Error adding content:', error)
      toast.error(error.message || 'Failed to add content')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      platform: 'INSTAGRAM',
      contentType: 'REEL',
      contentUrl: '',
      publishedAt: new Date().toISOString().slice(0, 16),
      caption: '',
      views: '',
      likes: '',
      comments: '',
      shares: '',
      saves: '',
      topic: '',
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl overflow-hidden w-full max-w-2xl pointer-events-auto max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Add Content Performance
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Track Instagram reels, posts, and other content
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Platform */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Platform
                </label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="YOUTUBE">YouTube</option>
                  <option value="FACEBOOK">Facebook</option>
                  <option value="TIKTOK">TikTok</option>
                </select>
              </div>

              {/* Content Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content Type
                </label>
                <select
                  value={formData.contentType}
                  onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="REEL">Reel</option>
                  <option value="POST">Post</option>
                  <option value="STORY">Story</option>
                  <option value="VIDEO">Video</option>
                  <option value="SHORT">Short</option>
                </select>
              </div>
            </div>

            {/* Content URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content URL *
              </label>
              <input
                type="url"
                value={formData.contentUrl}
                onChange={(e) => setFormData({ ...formData, contentUrl: e.target.value })}
                placeholder="https://www.instagram.com/reel/..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Published Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Published Date *
              </label>
              <input
                type="datetime-local"
                value={formData.publishedAt}
                onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Caption */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Caption (optional)
              </label>
              <textarea
                value={formData.caption}
                onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                placeholder="Enter the caption or description..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Metrics */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Performance Metrics (optional)
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Views</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.views}
                    onChange={(e) => setFormData({ ...formData, views: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Likes</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.likes}
                    onChange={(e) => setFormData({ ...formData, likes: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Comments</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.comments}
                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Shares</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.shares}
                    onChange={(e) => setFormData({ ...formData, shares: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Saves</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.saves}
                    onChange={(e) => setFormData({ ...formData, saves: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Topic</label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="e.g., grammar_tips"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Adding...' : 'Add Content'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

// Helper function to extract content ID from URL
function extractContentIdFromUrl(url: string, platform: string): string | null {
  try {
    if (platform === 'INSTAGRAM') {
      // Instagram: https://www.instagram.com/reel/ABC123/ or /p/ABC123/
      const match = url.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/)
      return match ? match[1] : null
    } else if (platform === 'YOUTUBE') {
      // YouTube: https://www.youtube.com/watch?v=ABC123 or youtu.be/ABC123
      const match = url.match(/(?:watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/)
      return match ? match[1] : null
    } else {
      // For other platforms, try to extract the last path segment
      const urlObj = new URL(url)
      const pathSegments = urlObj.pathname.split('/').filter(Boolean)
      return pathSegments[pathSegments.length - 1] || null
    }
  } catch {
    return null
  }
}
