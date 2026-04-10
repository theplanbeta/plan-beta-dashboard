// app/jobs-app/cvs/page.tsx
"use client"

import { useEffect, useState } from "react"
import { FileText, Download, Trash2, Loader2 } from "lucide-react"
import { useJobsAuth } from "@/components/jobs-app/AuthProvider"
import Link from "next/link"

interface CVEntry {
  id: string
  fileUrl: string
  language: string
  keywordsUsed: string[]
  templateUsed: string
  createdAt: string
  job: {
    title: string
    company: string
    slug: string | null
  }
}

export default function CVHistoryPage() {
  const { seeker, isPremium } = useJobsAuth()
  const [cvs, setCvs] = useState<CVEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!seeker) {
      setLoading(false)
      return
    }

    fetch("/api/jobs-app/cv")
      .then((res) => (res.ok ? res.json() : { cvs: [] }))
      .then((data) => setCvs(data.cvs || []))
      .finally(() => setLoading(false))
  }, [seeker])

  async function handleDelete(id: string) {
    if (!confirm("Delete this CV?")) return

    const res = await fetch(`/api/jobs-app/cv/${id}`, { method: "DELETE" })
    if (res.ok) {
      setCvs((prev) => prev.filter((cv) => cv.id !== id))
    }
  }

  if (!seeker) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-gray-500">
          <Link href="/jobs-app/onboarding" className="text-blue-600 underline">
            Sign up
          </Link>{" "}
          to generate and manage CVs
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-xl font-bold text-gray-900">My CVs</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      ) : cvs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <FileText className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No CVs generated yet</p>
          <Link
            href="/jobs-app/jobs"
            className="mt-2 inline-block text-sm text-blue-600 underline"
          >
            Browse jobs to generate your first CV
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {cvs.map((cv) => (
            <div
              key={cv.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {cv.job.title}
                </p>
                <p className="text-xs text-gray-500">
                  {cv.job.company} · {cv.language.toUpperCase()} ·{" "}
                  {new Date(cv.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {cv.keywordsUsed.slice(0, 5).map((kw, i) => (
                    <span
                      key={i}
                      className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500"
                    >
                      {kw}
                    </span>
                  ))}
                  {cv.keywordsUsed.length > 5 && (
                    <span className="text-xs text-gray-400">
                      +{cv.keywordsUsed.length - 5}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 pl-3">
                <a
                  href={cv.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  onClick={() => handleDelete(cv.id)}
                  className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
