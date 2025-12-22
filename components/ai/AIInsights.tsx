"use client"

import { useState } from "react"

type InsightType = "daily_digest" | "deep_analysis"

type InsightsResponse = {
  insights: string
  cached: boolean
  generatedAt: string
  dataSnapshot?: Record<string, unknown>
  error?: string
  message?: string
}

type QuestionResponse = {
  question: string
  answer: string
  generatedAt: string
  error?: string
  message?: string
}

export default function AIInsights() {
  const [insights, setInsights] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [insightType, setInsightType] = useState<InsightType>("daily_digest")
  const [cached, setCached] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  // Question mode
  const [question, setQuestion] = useState("")
  const [questionMode, setQuestionMode] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)

  const fetchInsights = async (refresh = false) => {
    setLoading(true)
    setError(null)
    setAnswer(null)

    try {
      const params = new URLSearchParams({
        type: insightType,
        period: "30",
        ...(refresh && { refresh: "true" }),
      })

      const res = await fetch(`/api/ai/insights?${params}`)
      const data: InsightsResponse = await res.json()

      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to fetch insights")
      }

      setInsights(data.insights)
      setCached(data.cached)
      setGeneratedAt(data.generatedAt)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch insights")
    } finally {
      setLoading(false)
    }
  }

  const askQuestion = async () => {
    if (!question.trim()) return

    setLoading(true)
    setError(null)
    setInsights(null)

    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, period: 30 }),
      })

      const data: QuestionResponse = await res.json()

      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to get answer")
      }

      setAnswer(data.answer)
      setGeneratedAt(data.generatedAt)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get answer")
    } finally {
      setLoading(false)
    }
  }

  const formatMarkdown = (text: string) => {
    // Simple markdown-like formatting
    return text
      .split("\n")
      .map((line, i) => {
        // Headers
        if (line.startsWith("## ")) {
          return (
            <h3 key={i} className="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-white">
              {line.replace("## ", "")}
            </h3>
          )
        }
        if (line.startsWith("# ")) {
          return (
            <h2 key={i} className="text-xl font-bold mt-4 mb-2 text-gray-900 dark:text-white">
              {line.replace("# ", "")}
            </h2>
          )
        }
        // Bullet points
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <li key={i} className="ml-4 text-gray-700 dark:text-gray-300">
              {line.replace(/^[-*] /, "")}
            </li>
          )
        }
        // Numbered lists
        if (/^\d+\. /.test(line)) {
          return (
            <li key={i} className="ml-4 text-gray-700 dark:text-gray-300 list-decimal">
              {line.replace(/^\d+\. /, "")}
            </li>
          )
        }
        // Bold text
        if (line.includes("**")) {
          const parts = line.split(/\*\*(.*?)\*\*/g)
          return (
            <p key={i} className="text-gray-700 dark:text-gray-300">
              {parts.map((part, j) =>
                j % 2 === 1 ? (
                  <strong key={j} className="font-semibold">
                    {part}
                  </strong>
                ) : (
                  part
                )
              )}
            </p>
          )
        }
        // Empty lines
        if (!line.trim()) {
          return <br key={i} />
        }
        // Regular text
        return (
          <p key={i} className="text-gray-700 dark:text-gray-300">
            {line}
          </p>
        )
      })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            AI Insights
          </h2>
          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
            Powered by Ollama
          </span>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            setQuestionMode(false)
            setAnswer(null)
          }}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            !questionMode
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          Get Insights
        </button>
        <button
          onClick={() => {
            setQuestionMode(true)
            setInsights(null)
          }}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            questionMode
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          Ask a Question
        </button>
      </div>

      {/* Insights Mode */}
      {!questionMode && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <select
              value={insightType}
              onChange={(e) => setInsightType(e.target.value as InsightType)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="daily_digest">Daily Digest (Quick)</option>
              <option value="deep_analysis">Deep Analysis (Detailed)</option>
            </select>
            <button
              onClick={() => fetchInsights(false)}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {loading ? "Analyzing..." : "Generate"}
            </button>
            {insights && (
              <button
                onClick={() => fetchInsights(true)}
                disabled={loading}
                className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
                title="Refresh insights"
              >
                🔄 Refresh
              </button>
            )}
          </div>

          {/* Cache indicator */}
          {generatedAt && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {cached ? "📦 Cached" : "✨ Fresh"} - Generated{" "}
              {new Date(generatedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Question Mode */}
      {questionMode && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askQuestion()}
              placeholder="Ask about your business data..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <button
              onClick={askQuestion}
              disabled={loading || !question.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {loading ? "Thinking..." : "Ask"}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Examples: "Why is churn high?", "Which marketing channel works best?", "How are evening batches performing?"
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          {error.includes("Ollama") && (
            <p className="text-red-600 dark:text-red-500 text-xs mt-1">
              Run <code className="bg-red-100 dark:bg-red-900 px-1 rounded">ollama serve</code> in terminal to start the AI server.
            </p>
          )}
        </div>
      )}

      {/* Results */}
      {(insights || answer) && !loading && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 max-h-[500px] overflow-y-auto">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {formatMarkdown(insights || answer || "")}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="mt-4 p-8 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
          <p className="text-sm">
            {questionMode ? "Thinking about your question..." : "Analyzing your business data..."}
          </p>
          <p className="text-xs text-gray-400 mt-1">This may take 10-30 seconds</p>
        </div>
      )}

      {/* Empty state */}
      {!insights && !answer && !loading && !error && (
        <div className="mt-4 p-8 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <p className="text-lg mb-2">🧠</p>
          <p className="text-sm">
            {questionMode
              ? "Ask any question about your business data"
              : "Click Generate to get AI-powered insights about your business"}
          </p>
        </div>
      )}
    </div>
  )
}
