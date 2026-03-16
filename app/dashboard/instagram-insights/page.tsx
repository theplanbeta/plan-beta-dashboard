"use client"

import { useState, useEffect } from "react"

interface InstagramInsight {
  id: string
  date: string
  postsAnalyzed: number
  avgLikes: number
  avgComments: number
  avgReelViews: number
  engagementRate: number
  bestFormat: string
  bestDays: string[]
  bestTimes: string[]
  topHashtags: string[]
  dropHashtags: string[]
  topThemes: string[]
  retireThemes: string[]
  weeklyActionItems: string[]
  fullReport: string
}

export default function InstagramInsightsPage() {
  const [insights, setInsights] = useState<InstagramInsight[]>([])
  const [selected, setSelected] = useState<InstagramInsight | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/instagram/insights?limit=20")
      .then((r) => r.json())
      .then((data) => {
        setInsights(data.insights || [])
        if (data.insights?.length > 0) setSelected(data.insights[0])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Instagram Insights
        </h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (insights.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Instagram Insights
        </h1>
        <div className="panel p-12 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No reports yet
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Weekly Instagram analysis reports from Kimi Claw will appear here.
          </p>
        </div>
      </div>
    )
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Instagram Insights
      </h1>

      {/* Report selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {insights.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelected(r)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selected?.id === r.id
                ? "bg-primary text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {formatDate(r.date)}
          </button>
        ))}
      </div>

      {selected && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Posts Analyzed", value: selected.postsAnalyzed, icon: "📝" },
              { label: "Avg Likes", value: Math.round(selected.avgLikes).toLocaleString(), icon: "❤️" },
              { label: "Avg Comments", value: Math.round(selected.avgComments).toLocaleString(), icon: "💬" },
              { label: "Avg Reel Views", value: Math.round(selected.avgReelViews).toLocaleString(), icon: "👁️" },
              { label: "Engagement Rate", value: `${selected.engagementRate.toFixed(1)}%`, icon: "📈" },
              { label: "Best Format", value: selected.bestFormat, icon: "🎯" },
            ].map((kpi) => (
              <div key={kpi.label} className="panel p-4">
                <div className="text-2xl mb-1">{kpi.icon}</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {kpi.value}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {kpi.label}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Insights Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Best Days */}
            <div className="panel p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Best Days to Post
              </h3>
              <div className="flex flex-wrap gap-2">
                {selected.bestDays.map((day) => (
                  <span
                    key={day}
                    className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm rounded-full"
                  >
                    {day}
                  </span>
                ))}
              </div>
            </div>

            {/* Best Times */}
            <div className="panel p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Best Times to Post
              </h3>
              <div className="flex flex-wrap gap-2">
                {selected.bestTimes.map((time) => (
                  <span
                    key={time}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm rounded-full"
                  >
                    {time}
                  </span>
                ))}
              </div>
            </div>

            {/* Top Themes */}
            <div className="panel p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Top Themes
              </h3>
              <div className="flex flex-wrap gap-2">
                {selected.topThemes.map((theme) => (
                  <span
                    key={theme}
                    className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-sm rounded-full"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Hashtags */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="panel p-5">
              <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-3">
                Top Hashtags (Keep Using)
              </h3>
              <div className="flex flex-wrap gap-2">
                {selected.topHashtags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="panel p-5">
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">
                Drop These Hashtags
              </h3>
              <div className="flex flex-wrap gap-2">
                {selected.dropHashtags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded line-through"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Retire Themes */}
          {selected.retireThemes.length > 0 && (
            <div className="panel p-5">
              <h3 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-3">
                Consider Retiring These Themes
              </h3>
              <div className="flex flex-wrap gap-2">
                {selected.retireThemes.map((theme) => (
                  <span
                    key={theme}
                    className="px-3 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-sm rounded-full"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Weekly Action Items */}
          <div className="panel p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              This Week&apos;s Action Items
            </h3>
            <ul className="space-y-2">
              {selected.weeklyActionItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                  <span className="text-gray-700 dark:text-gray-300 text-sm">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Full Report */}
          <details className="panel">
            <summary className="p-5 cursor-pointer text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg">
              Full Analysis Report
            </summary>
            <div className="px-5 pb-5 border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="prose dark:prose-invert prose-sm max-w-none whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {selected.fullReport}
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
