"use client"

import { useState } from "react"
import { TabSkeleton } from "./SkeletonLoader"
import { NotConfiguredBanner, ErrorBanner } from "./ServiceBanner"

// --- Types ---

interface InsightWin {
  title: string
  detail: string
}

interface InsightConcern {
  title: string
  detail: string
  priority: "high" | "medium" | "low"
}

interface ContentIdea {
  title: string
  description: string
  targetKeyword: string
  expectedImpact: "high" | "medium" | "low"
}

interface CampaignSuggestion {
  channel: string
  action: string
  rationale: string
  estimatedEffort: "low" | "medium" | "high"
}

interface InsightsData {
  configured: boolean
  message?: string
  summary?: string
  wins?: InsightWin[]
  concerns?: InsightConcern[]
  contentIdeas?: ContentIdea[]
  campaignSuggestions?: CampaignSuggestion[]
  weeklyPriorities?: string[]
  generatedAt?: string
}

type Props = {
  data: unknown
  loading: boolean
  error: string | null
}

// --- Priority Badge ---

function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  const styles = {
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[priority]}`}>
      {priority}
    </span>
  )
}

function ImpactBadge({ impact }: { impact: "high" | "medium" | "low" }) {
  const styles = {
    high: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    low: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[impact]}`}>
      {impact} impact
    </span>
  )
}

function EffortBadge({ effort }: { effort: "low" | "medium" | "high" }) {
  const labels = { low: "Quick win", medium: "Moderate effort", high: "Major effort" }
  const styles = {
    low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[effort]}`}>
      {labels[effort]}
    </span>
  )
}

// --- Section Card ---

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </div>
  )
}

// --- Main Component ---

export default function InsightsTab({ data, loading, error }: Props) {
  const [regenerating, setRegenerating] = useState(false)
  const [localData, setLocalData] = useState<InsightsData | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  if (loading && !localData) return <TabSkeleton />
  if (error && !localData) return <ErrorBanner message={error} />

  const insights = (localData || data) as InsightsData | null
  if (!insights?.configured) {
    return (
      <NotConfiguredBanner
        service="AI Marketing Insights"
        message={insights?.message || "Add ANTHROPIC_API_KEY environment variable to enable AI-powered marketing insights."}
      />
    )
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    setLocalError(null)
    try {
      const res = await fetch("/api/analytics/marketing-insights", { method: "POST" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const freshData = await res.json()
      setLocalData(freshData)
    } catch (err) {
      setLocalError((err as Error).message)
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {localError && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          Failed to regenerate insights: {localError}
        </div>
      )}

      {/* Summary */}
      {insights.summary && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2">
                <span>AI Marketing Summary</span>
              </h2>
              <p className="text-indigo-800 dark:text-indigo-200 leading-relaxed">{insights.summary}</p>
            </div>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="shrink-0 px-3 py-1.5 text-sm font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors disabled:opacity-50"
            >
              {regenerating ? "Generating..." : "Regenerate"}
            </button>
          </div>
        </div>
      )}

      {/* Wins + Concerns side by side on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* What's Working */}
        {insights.wins && insights.wins.length > 0 && (
          <SectionCard title="What's Working" icon="&#x2705;">
            <div className="space-y-3">
              {insights.wins.map((win, i) => (
                <div
                  key={i}
                  className="border-l-4 border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/10 rounded-r-lg p-4"
                >
                  <h3 className="font-medium text-green-900 dark:text-green-300 text-sm">{win.title}</h3>
                  <p className="text-green-800 dark:text-green-400 text-sm mt-1">{win.detail}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Areas of Concern */}
        {insights.concerns && insights.concerns.length > 0 && (
          <SectionCard title="Areas of Concern" icon="&#x26A0;&#xFE0F;">
            <div className="space-y-3">
              {insights.concerns.map((concern, i) => (
                <div
                  key={i}
                  className="border-l-4 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30 rounded-r-lg p-4"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900 dark:text-gray-200 text-sm">{concern.title}</h3>
                    <PriorityBadge priority={concern.priority} />
                  </div>
                  <p className="text-gray-700 dark:text-gray-400 text-sm">{concern.detail}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>

      {/* Content Ideas */}
      {insights.contentIdeas && insights.contentIdeas.length > 0 && (
        <SectionCard title="Content Ideas" icon="&#x1F4DD;">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.contentIdeas.map((idea, i) => (
              <div
                key={i}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">{idea.title}</h3>
                  <ImpactBadge impact={idea.expectedImpact} />
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{idea.description}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500 dark:text-gray-500">Target:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs font-mono text-gray-700 dark:text-gray-300">
                    {idea.targetKeyword}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Campaign Suggestions */}
      {insights.campaignSuggestions && insights.campaignSuggestions.length > 0 && (
        <SectionCard title="Campaign Suggestions" icon="&#x1F4E3;">
          <div className="space-y-4">
            {insights.campaignSuggestions.map((suggestion, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-start gap-3 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="shrink-0">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium">
                    {suggestion.channel}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">{suggestion.action}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{suggestion.rationale}</p>
                </div>
                <div className="shrink-0">
                  <EffortBadge effort={suggestion.estimatedEffort} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Weekly Priorities */}
      {insights.weeklyPriorities && insights.weeklyPriorities.length > 0 && (
        <SectionCard title="This Week's Priorities" icon="&#x1F3AF;">
          <ol className="space-y-3">
            {insights.weeklyPriorities.map((priority, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-primary/10 dark:bg-red-900/20 text-primary dark:text-red-400 text-sm font-bold">
                  {i + 1}
                </span>
                <span className="text-gray-800 dark:text-gray-200 text-sm pt-0.5">{priority}</span>
              </li>
            ))}
          </ol>
        </SectionCard>
      )}

      {/* Last generated timestamp */}
      {insights.generatedAt && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
          Last generated: {new Date(insights.generatedAt).toLocaleString()}
        </p>
      )}
    </div>
  )
}
