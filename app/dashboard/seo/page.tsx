"use client"

import { useState } from "react"
import Link from "next/link"
import {
  TARGET_KEYWORDS,
  analyzeSEO,
  MONTHLY_SEO_CHECKLIST,
  COMPETITOR_ANALYSIS_TEMPLATE,
  generateBlogIdeas,
} from "@/lib/seo"

// Page data for analysis
const pages = [
  {
    name: "Homepage",
    path: "/site",
    title: "Plan Beta - Learn German Online | Best German Language Institute in Kerala",
    description: "Master German with Kerala's premier language institute. Live online classes, expert instructors, and a proven track record of helping students achieve their German language goals.",
    targetKeywords: TARGET_KEYWORDS.home,
  },
  {
    name: "Courses",
    path: "/site/courses",
    title: "German Language Courses | Plan Beta - A1, A2, B1 Levels",
    description: "Explore our German language courses for all levels. From beginner A1 to intermediate B1, find the perfect course to achieve your German language goals.",
    targetKeywords: TARGET_KEYWORDS.courses,
  },
  {
    name: "Opportunities",
    path: "/site/opportunities",
    title: "Opportunities in Germany | Plan Beta - Work & Study in Germany",
    description: "Discover career opportunities in Germany for nursing, engineering, IT, and medical professionals. Learn about visa requirements, salary expectations, and how to get started.",
    targetKeywords: TARGET_KEYWORDS.opportunities,
  },
]

export default function SEODashboard() {
  const [selectedPage, setSelectedPage] = useState(pages[0])
  const [contentToAnalyze, setContentToAnalyze] = useState("")
  const [analysisResult, setAnalysisResult] = useState<ReturnType<typeof analyzeSEO> | null>(null)
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set())

  const runAnalysis = () => {
    if (!contentToAnalyze.trim()) {
      alert("Please paste your page content to analyze")
      return
    }

    const result = analyzeSEO({
      title: selectedPage.title,
      description: selectedPage.description,
      content: contentToAnalyze,
      targetKeywords: selectedPage.targetKeywords,
      url: selectedPage.path,
    })

    setAnalysisResult(result)
  }

  const toggleTask = (taskId: string) => {
    setCheckedTasks((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  const blogIdeas = generateBlogIdeas("Nurses")

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">SEO Dashboard</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Monitor and improve your website&apos;s search engine rankings
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
          >
            Google Search Console
          </a>
          <a
            href="https://analytics.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Google Analytics
          </a>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Pages Indexed</h3>
            <span className="text-green-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold">12</p>
          <p className="text-sm text-gray-500">All pages indexed</p>
        </div>

        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Target Keywords</h3>
          </div>
          <p className="mt-2 text-3xl font-bold">
            {Object.values(TARGET_KEYWORDS).flat().length}
          </p>
          <p className="text-sm text-gray-500">Being tracked</p>
        </div>

        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Monthly Tasks</h3>
          </div>
          <p className="mt-2 text-3xl font-bold">
            {checkedTasks.size}/{MONTHLY_SEO_CHECKLIST.length}
          </p>
          <p className="text-sm text-gray-500">Completed this month</p>
        </div>

        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Blog Posts</h3>
          </div>
          <p className="mt-2 text-3xl font-bold">6</p>
          <p className="text-sm text-gray-500">Published articles</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Page Analysis Tool */}
        <div className="panel p-6">
          <h2 className="text-lg font-semibold mb-4">Page SEO Analyzer</h2>

          <div className="space-y-4">
            <div>
              <label className="form-label">Select Page</label>
              <select
                value={selectedPage.name}
                onChange={(e) => {
                  const page = pages.find((p) => p.name === e.target.value)
                  if (page) setSelectedPage(page)
                }}
                className="select"
              >
                {pages.map((page) => (
                  <option key={page.name} value={page.name}>
                    {page.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Title ({selectedPage.title.length} chars)</label>
              <input
                type="text"
                value={selectedPage.title}
                readOnly
                className="input bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">Recommended: 30-60 characters</p>
            </div>

            <div>
              <label className="form-label">Description ({selectedPage.description.length} chars)</label>
              <textarea
                value={selectedPage.description}
                readOnly
                rows={2}
                className="textarea bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">Recommended: 120-160 characters</p>
            </div>

            <div>
              <label className="form-label">Target Keywords</label>
              <div className="flex flex-wrap gap-2">
                {selectedPage.targetKeywords.slice(0, 5).map((keyword) => (
                  <span
                    key={keyword}
                    className="px-2 py-1 bg-primary/10 text-primary text-xs rounded"
                  >
                    {keyword}
                  </span>
                ))}
                {selectedPage.targetKeywords.length > 5 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    +{selectedPage.targetKeywords.length - 5} more
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="form-label">Paste Page Content to Analyze</label>
              <textarea
                value={contentToAnalyze}
                onChange={(e) => setContentToAnalyze(e.target.value)}
                rows={4}
                placeholder="Copy and paste the text content from your page here..."
                className="textarea"
              />
            </div>

            <button onClick={runAnalysis} className="btn-primary w-full">
              Analyze SEO
            </button>
          </div>

          {analysisResult && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">SEO Score</h3>
                <span
                  className={`text-2xl font-bold ${
                    analysisResult.score >= 80
                      ? "text-green-500"
                      : analysisResult.score >= 60
                      ? "text-yellow-500"
                      : "text-red-500"
                  }`}
                >
                  {analysisResult.score}/100
                </span>
              </div>

              {analysisResult.issues.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-red-600 mb-2">Issues Found</h4>
                  <ul className="space-y-1">
                    {analysisResult.issues.map((issue, i) => (
                      <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                        <span>✗</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisResult.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-yellow-600 mb-2">Recommendations</h4>
                  <ul className="space-y-1">
                    {analysisResult.recommendations.slice(0, 5).map((rec, i) => (
                      <li key={i} className="text-sm text-yellow-600 flex items-start gap-2">
                        <span>→</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium mb-2">Keyword Density</h4>
                <div className="space-y-1">
                  {Object.entries(analysisResult.keywordDensity)
                    .slice(0, 5)
                    .map(([keyword, density]) => (
                      <div key={keyword} className="flex items-center justify-between text-sm">
                        <span className="truncate">{keyword}</span>
                        <span
                          className={
                            density >= 0.5 && density <= 2.5
                              ? "text-green-600"
                              : "text-yellow-600"
                          }
                        >
                          {density}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Monthly Checklist */}
        <div className="panel p-6">
          <h2 className="text-lg font-semibold mb-4">Monthly SEO Checklist</h2>
          <div className="space-y-3">
            {MONTHLY_SEO_CHECKLIST.map((item, index) => (
              <label
                key={index}
                className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg -mx-2"
              >
                <input
                  type="checkbox"
                  checked={checkedTasks.has(item.task)}
                  onChange={() => toggleTask(item.task)}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <span
                    className={
                      checkedTasks.has(item.task)
                        ? "line-through text-gray-400"
                        : ""
                    }
                  >
                    {item.task}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">({item.frequency})</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Blog Content Ideas */}
      <div className="panel p-6">
        <h2 className="text-lg font-semibold mb-4">Blog Content Ideas for SEO</h2>
        <p className="text-gray-600 mb-4">
          Consistent blogging is one of the most effective SEO strategies. Here are AI-generated ideas based on your target audience:
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          {blogIdeas.map((idea, index) => (
            <div key={index} className="border rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-2">{idea.title}</h3>
              <div className="flex flex-wrap gap-1 mb-3">
                {idea.keywords.map((kw) => (
                  <span key={kw} className="px-2 py-0.5 bg-gray-100 text-xs rounded">
                    {kw}
                  </span>
                ))}
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer text-primary">View outline</summary>
                <ol className="mt-2 space-y-1 text-gray-600 list-decimal list-inside">
                  {idea.outline.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ol>
              </details>
            </div>
          ))}
        </div>
      </div>

      {/* Free SEO Tools */}
      <div className="panel p-6">
        <h2 className="text-lg font-semibold mb-4">Free SEO Tools</h2>
        <p className="text-gray-600 mb-4">
          These free tools can help you monitor and improve your SEO without paying for expensive subscriptions:
        </p>

        <div className="grid md:grid-cols-4 gap-4">
          {COMPETITOR_ANALYSIS_TEMPLATE.tools.map((tool) => (
            <a
              key={tool.name}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all"
            >
              <h3 className="font-semibold">{tool.name}</h3>
              <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                Free
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="panel p-6 bg-gradient-to-r from-primary/10 to-red-50">
        <h2 className="text-lg font-semibold mb-4">Quick SEO Actions</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <a
            href="https://search.google.com/search-console/performance"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-sm">Check Rankings</h3>
            <p className="text-xs text-gray-500 mt-1">View keyword positions in Search Console</p>
          </a>
          <a
            href="https://pagespeed.web.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-sm">Test Page Speed</h3>
            <p className="text-xs text-gray-500 mt-1">Check Core Web Vitals</p>
          </a>
          <a
            href="https://www.google.com/search?q=site:planbeta.in"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-sm">Check Indexed Pages</h3>
            <p className="text-xs text-gray-500 mt-1">See all indexed pages</p>
          </a>
          <Link
            href="/site/blog"
            className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-sm">Write New Blog</h3>
            <p className="text-xs text-gray-500 mt-1">Add fresh content for SEO</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
