"use client"

import { useState } from "react"

// Tab components (we'll create these)
import SubredditsTab from "./components/SubredditsTab"
import FeedTab from "./components/FeedTab"
import IdeasTab from "./components/IdeasTab"

type Tab = "subreddits" | "feed" | "ideas"

export default function ContentLabPage() {
  const [activeTab, setActiveTab] = useState<Tab>("subreddits")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Content Lab</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Discover trending topics from Reddit and generate Instagram content ideas with AI
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("subreddits")}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === "subreddits"
                ? "border-primary text-primary dark:border-red-400 dark:text-red-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }
            `}
          >
            Subreddits
          </button>
          <button
            onClick={() => setActiveTab("feed")}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === "feed"
                ? "border-primary text-primary dark:border-red-400 dark:text-red-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }
            `}
          >
            Feed
          </button>
          <button
            onClick={() => setActiveTab("ideas")}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === "ideas"
                ? "border-primary text-primary dark:border-red-400 dark:text-red-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }
            `}
          >
            Ideas
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "subreddits" && <SubredditsTab />}
        {activeTab === "feed" && <FeedTab />}
        {activeTab === "ideas" && <IdeasTab />}
      </div>
    </div>
  )
}
