'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

type InstagramComment = {
  id: string
  username: string
  text: string
  priority: string
  triggerWords: string[]
  leadCreated: boolean
  leadId: string | null
  replied: boolean
  replyText: string | null
  commentedAt: string
  mediaUrl: string | null
}

type InstagramMessage = {
  id: string
  senderUsername: string | null
  text: string | null
  status: string | null
  createdAt: string
}

export default function InstagramPage() {
  const [comments, setComments] = useState<InstagramComment[]>([])
  const [messages, setMessages] = useState<InstagramMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'comments' | 'messages'>('comments')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [commentsRes, messagesRes] = await Promise.all([
        fetch('/api/instagram/comments'),
        fetch('/api/instagram/messages'),
      ])

      const commentsData = await commentsRes.json()
      const messagesData = await messagesRes.json()

      setComments(Array.isArray(commentsData) ? commentsData : [])
      setMessages(Array.isArray(messagesData) ? messagesData : [])
    } catch (error) {
      console.error('Error fetching Instagram data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '🚨'
      case 'high':
        return '⚠️'
      case 'medium':
        return '📌'
      default:
        return '📝'
    }
  }

  const highPriorityCount = comments.filter(
    (c) => c.priority === 'critical' || c.priority === 'high'
  ).length
  const leadsCreatedCount = comments.filter((c) => c.leadCreated).length
  const repliedCount = comments.filter((c) => c.replied).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading Instagram data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Instagram Engagement
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Track comments and messages from your Instagram business account
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">Total Comments</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{comments.length}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400">All time</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">High Priority</div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {highPriorityCount}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Critical + High priority</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">Leads Created</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {leadsCreatedCount}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Auto-converted from comments</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">Auto-Replied</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{repliedCount}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {comments.length > 0
              ? `${Math.round((repliedCount / comments.length) * 100)}% reply rate`
              : 'No comments yet'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('comments')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'comments'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              💬 Comments ({comments.length})
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'messages'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              📨 Messages ({messages.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'comments' && (
            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">💬</div>
                  <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No comments yet
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Comments will appear here when people interact with your Instagram posts
                  </p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            @{comment.username}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(
                              comment.priority
                            )}`}
                          >
                            {getPriorityIcon(comment.priority)} {comment.priority.toUpperCase()}
                          </span>
                          {comment.leadCreated && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              ✅ Lead Created
                            </span>
                          )}
                          {comment.replied && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              ↩️ Replied
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-900 dark:text-white">{comment.text}</p>

                        {comment.triggerWords.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Triggers:
                            </span>
                            {comment.triggerWords.map((word) => (
                              <span
                                key={word}
                                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                              >
                                {word}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            {new Date(comment.commentedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {comment.mediaUrl && (
                            <a
                              href={comment.mediaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View Post
                            </a>
                          )}
                          {comment.leadId && (
                            <Link
                              href={`/dashboard/leads/${comment.leadId}`}
                              className="text-blue-600 hover:underline"
                            >
                              View Lead
                            </Link>
                          )}
                        </div>

                        {comment.replied && comment.replyText && (
                          <div className="mt-3 pl-4 border-l-2 border-blue-300 bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              Auto-reply sent:
                            </p>
                            <p className="text-sm text-blue-900 dark:text-blue-100">
                              {comment.replyText}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">📨</div>
                  <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No messages yet
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Direct messages will appear here when people message your Instagram account
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            @{message.senderUsername || 'Unknown'}
                          </span>
                          {message.status && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              {message.status}
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-900 dark:text-white">
                          {message.text || '(No text)'}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            {new Date(message.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
