"use client"

import { useState, useEffect, useCallback } from "react"
import { useToast } from "@/components/Toast"

interface UtmLink {
  id: string
  name: string
  destination: string
  slug: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmContent: string | null
  utmTerm: string | null
  clicks: number
  createdAt: string
}

const DESTINATIONS = [
  { group: "Pages", items: [
    { value: "/site", label: "Homepage" },
    { value: "/site/contact", label: "Contact Page" },
    { value: "/site/nurses", label: "Nurses Page" },
    { value: "/site/courses", label: "Courses Page" },
    { value: "/site/opportunities", label: "Opportunities Page" },
    { value: "/site/about", label: "About Page" },
    { value: "/site/blog", label: "Blog" },
    { value: "/site/refer", label: "Referral Page" },
  ]},
  { group: "Course Levels", items: [
    { value: "/site/courses#a1", label: "A1 Course" },
    { value: "/site/courses#a2", label: "A2 Course" },
    { value: "/site/courses#b1", label: "B1 Course" },
    { value: "/site/courses#b2", label: "B2 Course" },
  ]},
  { group: "WhatsApp CTAs", items: [
    { value: "wa:a1", label: "WhatsApp — A1 Enquiry" },
    { value: "wa:a2", label: "WhatsApp — A2 Enquiry" },
    { value: "wa:b1", label: "WhatsApp — B1 Enquiry" },
    { value: "wa:b2", label: "WhatsApp — B2 Enquiry" },
    { value: "wa:nurse", label: "WhatsApp — Nurse Enquiry" },
    { value: "wa:general", label: "WhatsApp — General" },
  ]},
]

// Flat list for lookups
const ALL_DESTINATIONS = DESTINATIONS.flatMap(g => g.items)

const SOURCES = [
  "facebook",
  "instagram",
  "google",
  "whatsapp",
  "youtube",
  "email",
  "referral",
]

const MEDIUMS = [
  "social",
  "paid",
  "cpc",
  "email",
  "organic",
  "story",
  "reel",
  "bio",
]

const emptyForm = {
  name: "",
  destination: "/site/contact",
  slug: "",
  utmSource: "instagram",
  utmMedium: "social",
  utmCampaign: "",
  utmContent: "",
  utmTerm: "",
}

export default function UtmLinksPage() {
  const [links, setLinks] = useState<UtmLink[]>([])
  const [totals, setTotals] = useState({ count: 0, totalClicks: 0 })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { addToast } = useToast()

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch("/api/utm-links")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setLinks(data.links)
      setTotals(data.totals)
    } catch {
      addToast("Failed to load links", { type: "error" })
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  const getShortUrl = (slug: string) => `theplanbeta.com/go/${slug}`

  const copyToClipboard = async (slug: string, id: string) => {
    try {
      await navigator.clipboard.writeText(`https://${getShortUrl(slug)}`)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      addToast("Failed to copy", { type: "error" })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch("/api/utm-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        addToast(data.error || "Failed to create link", { type: "error" })
        return
      }

      addToast("Link created!", { type: "success" })
      setShowForm(false)
      setFormData(emptyForm)
      fetchLinks()
    } catch {
      addToast("Failed to create link", { type: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this link?")) return

    try {
      const res = await fetch(`/api/utm-links/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      addToast("Link deleted", { type: "success" })
      fetchLinks()
    } catch {
      addToast("Failed to delete", { type: "error" })
    }
  }

  // Top campaign by clicks
  const topCampaign = links.length > 0
    ? links.reduce((best, link) =>
        link.clicks > (best?.clicks || 0) ? link : best,
      links[0])
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            UTM Links
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Create trackable short links for Instagram, WhatsApp, and ads
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          + Create Link
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="panel p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Links</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {totals.count}
          </p>
        </div>
        <div className="panel p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Clicks</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {totals.totalClicks}
          </p>
        </div>
        <div className="panel p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Top Link</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate">
            {topCampaign ? topCampaign.name : "—"}
          </p>
          {topCampaign && topCampaign.clicks > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{topCampaign.clicks} clicks</p>
          )}
        </div>
      </div>

      {/* Links Table */}
      <div className="panel overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : links.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium mb-1">No links yet</p>
            <p className="text-sm">Create your first trackable link to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="text-left p-3 font-medium text-gray-500 dark:text-gray-400">Short URL</th>
                  <th className="text-left p-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Destination</th>
                  <th className="text-left p-3 font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">UTM</th>
                  <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400">Clicks</th>
                  <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr
                    key={link.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="p-3">
                      <p className="font-medium text-gray-900 dark:text-white">{link.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 md:hidden">
                        {ALL_DESTINATIONS.find(d => d.value === link.destination)?.label || link.destination}
                      </p>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                          {getShortUrl(link.slug)}
                        </code>
                        <button
                          onClick={() => copyToClipboard(link.slug, link.id)}
                          className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                          title="Copy link"
                        >
                          {copiedId === link.id ? (
                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell text-gray-600 dark:text-gray-400">
                      {ALL_DESTINATIONS.find(d => d.value === link.destination)?.label || link.destination}
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        <span className="inline-flex px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {link.utmSource}
                        </span>
                        <span className="inline-flex px-1.5 py-0.5 text-xs rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                          {link.utmMedium}
                        </span>
                        <span className="inline-flex px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {link.utmCampaign}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono font-medium text-gray-900 dark:text-white">
                      {link.clicks}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Link Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowForm(false)}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Create Trackable Link
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Link Name
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="e.g. Nursing March - Instagram Story"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                {/* Destination */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Destination Page
                  </label>
                  <select
                    className="select w-full"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  >
                    {DESTINATIONS.map((group) => (
                      <optgroup key={group.group} label={group.group}>
                        {group.items.map((d) => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Source + Medium */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Source
                    </label>
                    <select
                      className="select w-full"
                      value={formData.utmSource}
                      onChange={(e) => setFormData({ ...formData, utmSource: e.target.value })}
                    >
                      {SOURCES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Medium
                    </label>
                    <select
                      className="select w-full"
                      value={formData.utmMedium}
                      onChange={(e) => setFormData({ ...formData, utmMedium: e.target.value })}
                    >
                      {MEDIUMS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Campaign */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Campaign
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="e.g. nurses-march-2026"
                    value={formData.utmCampaign}
                    onChange={(e) => setFormData({ ...formData, utmCampaign: e.target.value })}
                    required
                  />
                </div>

                {/* Content (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Content <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="e.g. story-cta, hero-banner"
                    value={formData.utmContent}
                    onChange={(e) => setFormData({ ...formData, utmContent: e.target.value })}
                  />
                </div>

                {/* Custom Slug */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Custom Slug <span className="text-gray-400">(optional — auto-generated if blank)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400 whitespace-nowrap">theplanbeta.com/go/</span>
                    <input
                      type="text"
                      className="input w-full"
                      placeholder="nurses-march"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                        })
                      }
                    />
                  </div>
                </div>

                {/* Preview */}
                {formData.utmCampaign && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Link preview:</p>
                    <p className="text-sm font-mono text-gray-700 dark:text-gray-300 break-all">
                      theplanbeta.com/go/{formData.slug || "auto"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      → {ALL_DESTINATIONS.find(d => d.value === formData.destination)?.label}
                      {" · "}{formData.utmSource}/{formData.utmMedium}/{formData.utmCampaign}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setFormData(emptyForm) }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary"
                  >
                    {submitting ? "Creating..." : "Create Link"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
