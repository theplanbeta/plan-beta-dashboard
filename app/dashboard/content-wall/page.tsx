"use client"

import { useState, useEffect } from "react"
import { Heart, MessageCircle, Eye, PenSquare, Sparkles, Trash2 } from "lucide-react"
import { useSession } from "next-auth/react"
import CreatePostModal from "./components/CreatePostModal"

interface Post {
  id: string
  title: string
  content: string
  contentType: string
  level?: string
  language: string
  viewCount: number
  featured: boolean
  createdAt: string
  student: {
    id: string
    studentId: string
    name: string
    currentLevel: string
  }
  likes: Array<{ studentId: string }>
  comments: Array<{
    id: string
    content: string
    createdAt: string
    student: {
      id: string
      name: string
    }
  }>
  _count: {
    likes: number
    comments: number
  }
}

export default function ContentWallPage() {
  const { data: session } = useSession()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("ALL")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [currentStudentId, setCurrentStudentId] = useState<string>("")

  useEffect(() => {
    fetchPosts()
  }, [filter])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter !== "ALL") params.append("contentType", filter)

      const response = await fetch(`/api/content-wall?${params}`)
      const data = await response.json()
      setPosts(data.posts || [])
    } catch (error) {
      console.error("Error fetching posts:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (postId: string) => {
    const studentId = "dummy-student-id"

    try {
      const response = await fetch(`/api/content-wall/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      })

      if (response.ok) {
        fetchPosts()
      }
    } catch (error) {
      console.error("Error liking post:", error)
    }
  }

  const handleDelete = async (postId: string, postStudentId: string) => {
    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/content-wall/${postId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: postStudentId }),
      })

      if (response.ok) {
        fetchPosts()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete post")
      }
    } catch (error) {
      console.error("Error deleting post:", error)
      alert("Failed to delete post")
    }
  }

  const canDeletePost = (postStudentId: string) => {
    // Admins and teachers can delete any post
    if (session?.user?.role === "FOUNDER" || session?.user?.role === "TEACHER") {
      return true
    }
    // Students can delete their own posts (if they know their studentId)
    return false
  }

  const contentTypes = [
    { value: "ALL", label: "All Posts" },
    { value: "STORY", label: "Stories" },
    { value: "POEM", label: "Poems" },
    { value: "ESSAY", label: "Essays" },
    { value: "VOCABULARY", label: "Vocabulary" },
    { value: "GRAMMAR_TIP", label: "Grammar Tips" },
  ]

  const getContentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      STORY: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      POEM: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
      ESSAY: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      LETTER: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      DIALOGUE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      VOCABULARY: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      GRAMMAR_TIP: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
      OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    }
    return colors[type] || colors.OTHER
  }

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      NEW: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
      A1: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      A2: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      B1: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      B2: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    }
    return colors[level] || colors.NEW
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-8 w-8 text-yellow-500" />
                  Student Content Wall
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Share your creative German writing and inspire others
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2"
              >
                <PenSquare className="h-4 w-4" />
                Create Post
              </button>
            </div>

            {/* Filters */}
            <div className="mt-6 flex gap-2 overflow-x-auto">
              {contentTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setFilter(type.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    filter === type.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading posts...</div>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <PenSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No posts yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Be the first to share your creative German writing!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
            >
              Create First Post
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getContentTypeColor(post.contentType)}`}>
                          {post.contentType.replace(/_/g, " ")}
                        </span>
                        {post.level && (
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getLevelColor(post.level)}`}>
                            {post.level}
                          </span>
                        )}
                        {post.featured && (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            Featured
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{post.title}</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        by <span className="font-medium">{post.student.name}</span>
                        <span className="mx-2">•</span>
                        {new Date(post.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    {canDeletePost(post.student.studentId) && (
                      <button
                        onClick={() => handleDelete(post.id, post.student.studentId)}
                        className="ml-4 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        title="Delete post"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                      {post.content}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                    <button
                      onClick={() => handleLike(post.id)}
                      className="flex items-center gap-1 hover:text-red-500 transition-colors"
                    >
                      <Heart className="h-4 w-4" />
                      <span>{post._count.likes}</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      <span>{post._count.comments}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{post.viewCount}</span>
                    </div>
                  </div>
                </div>

                {/* Comments */}
                {post.comments.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-600 px-6 py-4">
                    <h4 className="font-medium text-sm mb-3 text-gray-700 dark:text-gray-300">
                      Comments ({post.comments.length})
                    </h4>
                    <div className="space-y-3">
                      {post.comments.slice(0, 3).map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <div className="flex-1">
                            <div className="bg-gray-100 dark:bg-gray-600 rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm text-gray-900 dark:text-white">{comment.student.name}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(comment.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {post.comments.length > 3 && (
                        <button className="text-sm text-blue-600 hover:underline">
                          View all {post.comments.length} comments
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchPosts}
        />
      )}
    </div>
  )
}
