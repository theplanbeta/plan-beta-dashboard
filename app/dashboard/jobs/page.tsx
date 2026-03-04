"use client"

import { useState, useEffect, useCallback } from "react"

interface JobSource {
  id: string
  name: string
  url: string
  active: boolean
  lastFetched: string | null
  jobCount: number
  createdAt: string
  _count: { jobs: number }
}

interface JobPosting {
  id: string
  title: string
  company: string
  location: string | null
  profession: string | null
  germanLevel: string | null
  active: boolean
  postedAt: string | null
  source: { name: string }
}

const PRESET_SOURCES = [
  { name: "BA — Nursing Jobs", url: "https://www.arbeitsagentur.de/jobsuche?was=Krankenpfleger" },
  { name: "BA — Healthcare/Pflege", url: "https://www.arbeitsagentur.de/jobsuche?was=Pflege" },
  { name: "BA — Engineering", url: "https://www.arbeitsagentur.de/jobsuche?was=Ingenieur" },
  { name: "BA — IT Jobs", url: "https://www.arbeitsagentur.de/jobsuche?was=Software%20Developer" },
  { name: "BA — Nebenjobs", url: "https://www.arbeitsagentur.de/jobsuche?was=Nebenjob" },
  { name: "BA — Werkstudent", url: "https://www.arbeitsagentur.de/jobsuche?was=Werkstudent&arbeitszeit=tz" },
  { name: "BA — Studentenjobs", url: "https://www.arbeitsagentur.de/jobsuche?was=Studentenjob" },
  { name: "BA — Mini-Jobs", url: "https://www.arbeitsagentur.de/jobsuche?was=Minijob&arbeitszeit=mj" },
  { name: "Arbeitnow — All Jobs", url: "https://www.arbeitnow.com/api/job-board-api" },
]

export default function JobsDashboardPage() {
  const [sources, setSources] = useState<JobSource[]>([])
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState<string | null>(null)
  const [showAddSource, setShowAddSource] = useState(false)
  const [newSource, setNewSource] = useState({ name: "", url: "" })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const fetchData = useCallback(async () => {
    try {
      const [sourcesRes, jobsRes] = await Promise.all([
        fetch("/api/jobs/sources"),
        fetch("/api/jobs"),
      ])
      if (sourcesRes.ok) setSources(await sourcesRes.json())
      if (jobsRes.ok) {
        const data = await jobsRes.json()
        setJobs(data.jobs || [])
      }
    } catch {
      setError("Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleScrape = async (sourceId?: string) => {
    setScraping(sourceId || "all")
    setError("")
    setSuccess("")

    try {
      const res = await fetch("/api/jobs/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sourceId ? { sourceId } : {}),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(`Scraped ${data.count || data.total || 0} jobs successfully`)
        fetchData()
      } else {
        setError(data.error || "Scraping failed")
      }
    } catch {
      setError("Scraping request failed")
    } finally {
      setScraping(null)
    }
  }

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      const res = await fetch("/api/jobs/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSource),
      })
      const data = await res.json()
      if (res.ok) {
        setNewSource({ name: "", url: "" })
        setShowAddSource(false)
        setSuccess("Source added successfully")
        fetchData()
      } else {
        setError(data.error || "Failed to add source")
      }
    } catch {
      setError("Failed to add source")
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Job Portal Management</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Job Portal Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage job sources and listings for the public job portal
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddSource(!showAddSource)}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {showAddSource ? "Cancel" : "Add Source"}
          </button>
          <button
            onClick={() => handleScrape()}
            disabled={scraping !== null}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {scraping === "all" ? "Scraping..." : "Scrape All Sources"}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Add Source Form */}
      {showAddSource && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="font-medium mb-3">Add New Job Source</h3>

          {/* Preset Quick-Add */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-2">Quick Add (Presets)</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_SOURCES
                .filter((p) => !sources.some((s) => s.name === p.name))
                .map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setNewSource({ name: preset.name, url: preset.url })}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      newSource.name === preset.name
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
            </div>
          </div>

          <form onSubmit={handleAddSource} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Source Name</label>
              <input
                type="text"
                placeholder="e.g. Make-It-in-Germany"
                value={newSource.name}
                onChange={(e) => setNewSource((s) => ({ ...s, name: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700"
              />
            </div>
            <div className="flex-[2]">
              <label className="block text-xs text-gray-500 mb-1">URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={newSource.url}
                onChange={(e) => setNewSource((s) => ({ ...s, url: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </form>
        </div>
      )}

      {/* Sources */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Job Sources ({sources.length})</h2>
        {sources.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 text-sm">No sources configured yet. Add one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${source.active ? "bg-green-400" : "bg-gray-400"}`} />
                    <h3 className="font-medium truncate">{source.name}</h3>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-1">{source.url}</p>
                  <div className="flex gap-4 mt-1 text-xs text-gray-400">
                    <span>{source._count?.jobs || source.jobCount} active jobs</span>
                    <span>
                      Last scraped:{" "}
                      {source.lastFetched
                        ? new Date(source.lastFetched).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Never"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleScrape(source.id)}
                  disabled={scraping !== null}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  {scraping === source.id ? "Scraping..." : "Scrape Now"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Jobs */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Job Postings ({jobs.length})</h2>
        {jobs.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 text-sm">No jobs yet. Add a source and scrape to populate.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500 uppercase">
                  <th className="pb-2 pr-4">Title</th>
                  <th className="pb-2 pr-4">Company</th>
                  <th className="pb-2 pr-4">Location</th>
                  <th className="pb-2 pr-4">Level</th>
                  <th className="pb-2 pr-4">Source</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {jobs.slice(0, 30).map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-2 pr-4 font-medium max-w-[200px] truncate">{job.title}</td>
                    <td className="py-2 pr-4 text-gray-500 max-w-[150px] truncate">{job.company}</td>
                    <td className="py-2 pr-4 text-gray-500">{job.location || "—"}</td>
                    <td className="py-2 pr-4">
                      {job.germanLevel ? (
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-xs">
                          {job.germanLevel}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-4 text-gray-500 text-xs">{job.source?.name}</td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          job.active
                            ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                        }`}
                      >
                        {job.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
