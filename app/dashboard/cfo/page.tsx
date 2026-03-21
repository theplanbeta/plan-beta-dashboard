"use client"

import { useState, useRef, useEffect, useCallback } from "react"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
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

  const clearChat = () => {
    setMessages([])
    setError("")
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-white/[0.06] bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-sm px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <span className="text-emerald-600 dark:text-emerald-400 text-lg font-bold">₹</span>
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900 dark:text-white">CFO Agent</h1>
              <p className="text-xs text-gray-500 dark:text-gray-500">Live business data &middot; IPO strategy</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
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
              <span className="text-emerald-600 dark:text-emerald-400 text-3xl font-bold">₹</span>
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
