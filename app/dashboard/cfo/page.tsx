"use client"

import { useState, useRef, useEffect, useCallback } from "react"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface Conversation {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
}

const SUGGESTED_QUESTIONS = [
  "How are we doing this month?",
  "Which batches should we launch and which should we hold?",
  "What's our biggest financial risk right now?",
  "Can we afford to hire another teacher?",
  "How far are we from IPO readiness?",
  "What should I focus on this week?",
  "Show me our unit economics — CAC, LTV, margins",
  "Are we spending too much on marketing?",
]

export default function CfoPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [savedActions, setSavedActions] = useState<Set<number>>(new Set())
  const [savingAction, setSavingAction] = useState<number | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto"
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  // Load conversations on mount
  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true)
    try {
      const res = await fetch("/api/cfo/conversations")
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } catch {
      // silent
    } finally {
      setLoadingConversations(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/cfo/conversations/${id}`)
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      const loadedMessages: Message[] = (data.messages || []).map(
        (m: { role: "user" | "assistant"; content: string; timestamp: string }) => ({
          role: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp),
        })
      )
      setMessages(loadedMessages)
      setConversationId(id)
      setError("")
      setSavedActions(new Set())
    } catch {
      setError("Failed to load conversation")
    }
  }

  const newConversation = () => {
    setMessages([])
    setConversationId(null)
    setError("")
    setSavedActions(new Set())
  }

  const deleteConversation = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/cfo/conversations/${id}`, { method: "DELETE" })
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== id))
        if (conversationId === id) {
          newConversation()
        }
      }
    } catch {
      // silent
    } finally {
      setDeletingId(null)
    }
  }

  const saveAsActionItem = async (msgIndex: number, content: string) => {
    setSavingAction(msgIndex)
    try {
      // Extract title: first non-empty, non-header line, truncated
      const lines = content.split("\n").filter(l => l.trim() && !l.startsWith("#"))
      let title = lines[0] || "CFO Action Item"
      title = title.replace(/^\*\*/g, "").replace(/\*\*$/g, "").replace(/^[-•]\s*/, "").slice(0, 120)

      const res = await fetch("/api/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: content.slice(0, 2000),
          source: "CFO Agent",
          category: "Finance",
          priority: "MEDIUM",
        }),
      })
      if (res.ok) {
        setSavedActions(prev => new Set(prev).add(msgIndex))
      }
    } catch {
      // silent
    } finally {
      setSavingAction(null)
    }
  }

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || loading) return

    const userMessage: Message = { role: "user", content: messageText, timestamp: new Date() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput("")
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/cfo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          conversationId,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      const data = await res.json()
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.reply, timestamp: new Date() },
      ])

      // Track conversation ID and refresh list
      if (data.conversationId) {
        const isNew = !conversationId
        setConversationId(data.conversationId)
        if (isNew) {
          fetchConversations()
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get response")
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* Sidebar */}
      <div
        className={`flex-shrink-0 border-r border-gray-200 dark:border-white/[0.06] bg-gray-50/50 dark:bg-[#0a0a0a]/50 transition-all duration-200 overflow-hidden ${
          sidebarOpen ? "w-64" : "w-0"
        }`}
      >
        <div className="w-64 h-full flex flex-col">
          {/* Sidebar header */}
          <div className="flex-shrink-0 px-3 py-3 border-b border-gray-200 dark:border-white/[0.06]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Conversations</h2>
              <button
                onClick={newConversation}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium px-2 py-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
              >
                + New
              </button>
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto py-1">
            {loadingConversations ? (
              <div className="px-3 py-4 text-xs text-gray-400 dark:text-gray-600 text-center">
                Loading...
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-3 py-4 text-xs text-gray-400 dark:text-gray-600 text-center">
                No conversations yet
              </div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-1 mx-1 rounded-lg cursor-pointer transition-colors ${
                    conversationId === conv.id
                      ? "bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20"
                      : "hover:bg-gray-100 dark:hover:bg-white/[0.04] border border-transparent"
                  }`}
                  onClick={() => loadConversation(conv.id)}
                >
                  <div className="flex-1 min-w-0 px-3 py-2">
                    <p
                      className={`text-sm truncate ${
                        conversationId === conv.id
                          ? "text-purple-700 dark:text-purple-300 font-medium"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {conv.title || "Untitled"}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">
                      {new Date(conv.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteConversation(conv.id)
                    }}
                    disabled={deletingId === conv.id}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 mr-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all disabled:opacity-50"
                    title="Delete conversation"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-white/[0.06] bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-sm px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(prev => !prev)}
                className="p-1 -ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <span className="text-emerald-600 dark:text-emerald-400 text-lg font-bold">&#x20B9;</span>
              </div>
              <div>
                <h1 className="text-base font-semibold text-gray-900 dark:text-white">CFO Agent</h1>
                <p className="text-xs text-gray-500 dark:text-gray-500">Live business data &middot; IPO strategy</p>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={newConversation}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1 rounded transition-colors"
              >
                Clear chat
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                <span className="text-emerald-600 dark:text-emerald-400 text-3xl font-bold">&#x20B9;</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Talk to your CFO</h2>
              <p className="text-sm text-gray-500 dark:text-gray-500 text-center mb-6">
                I have access to your live financial data. Ask me anything about
                revenue, batches, margins, growth, or IPO readiness.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-left text-sm px-3 py-2.5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.1] transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-emerald-50 dark:bg-emerald-600/20 border border-emerald-200 dark:border-emerald-500/20 text-gray-800 dark:text-gray-200"
                        : "bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">CFO</span>
                        <span className="text-gray-400 dark:text-gray-600 text-[10px]">
                          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap leading-relaxed cfo-response">
                      {formatCfoResponse(msg.content)}
                    </div>
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-white/[0.04]">
                        <button
                          onClick={() => saveAsActionItem(i, msg.content)}
                          disabled={savedActions.has(i) || savingAction === i}
                          className="text-[11px] text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-50 transition-colors flex items-center gap-1"
                        >
                          {savedActions.has(i) ? (
                            <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Saved</>
                          ) : savingAction === i ? (
                            "Saving..."
                          ) : (
                            <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Save as action item</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">CFO</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500/60 dark:bg-emerald-400/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-emerald-500/60 dark:bg-emerald-400/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-emerald-500/60 dark:bg-emerald-400/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                      Analyzing your data...
                    </div>
                  </div>
                </div>
              )}
              {error && (
                <div className="flex justify-center">
                  <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-white/[0.06] bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-sm px-4 sm:px-6 py-3">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your CFO anything..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none bg-gray-50 dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-10 h-10 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:opacity-50 rounded-xl flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" />
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center mt-1.5">
            Uses live data from your dashboard. Powered by Claude.
          </p>
        </div>
      </div>
    </div>
  )
}

// Simple markdown-like formatting for CFO responses
function formatCfoResponse(text: string) {
  return text.split("\n").map((line, i) => {
    // Bold text: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/)
    const formatted = parts.map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={j} className="text-gray-900 dark:text-white font-semibold">
            {part.slice(2, -2)}
          </strong>
        )
      }
      return part
    })

    // Headers
    if (line.startsWith("### ")) {
      return <h4 key={i} className="text-gray-900 dark:text-white font-semibold mt-3 mb-1">{line.slice(4)}</h4>
    }
    if (line.startsWith("## ")) {
      return <h3 key={i} className="text-gray-900 dark:text-white font-bold mt-4 mb-1 text-base">{line.slice(3)}</h3>
    }

    // Emoji indicators (alerts, status)
    if (line.match(/^[🔴🟡🟢✅⚠️🚨📊💰]/u)) {
      return <p key={i} className="mt-1 font-medium">{formatted}</p>
    }

    // Tree-like lines
    if (line.match(/^[├└│─]/)) {
      return <p key={i} className="font-mono text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{formatted}</p>
    }

    // Bullet points
    if (line.match(/^\s*[-•]\s/)) {
      return <p key={i} className="ml-2">{formatted}</p>
    }

    // Numbered items
    if (line.match(/^\s*\d+\.\s/)) {
      return <p key={i} className="ml-1 mt-0.5">{formatted}</p>
    }

    // Empty lines
    if (line.trim() === "") {
      return <div key={i} className="h-2" />
    }

    return <p key={i}>{formatted}</p>
  })
}
