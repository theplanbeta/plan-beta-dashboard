"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { GenerateInvoiceButton } from "@/components/GenerateInvoiceButton"

type Lead = {
  id: string
  name: string
  whatsapp: string
  email: string | null
  phone: string | null
  source: string
  status: string
  quality: string
  interestedLevel: string | null
  interestedType: string | null
  converted: boolean
  convertedDate: string | null
  interestedBatch: {
    batchCode: string
    level: string
    enrolledCount: number
    totalSeats: number
  } | null
  assignedTo: {
    name: string
    email: string
  } | null
  convertedToStudent: {
    id: string
    studentId: string
    name: string
  } | null
  firstContactDate: string
  lastContactDate: string | null
  followUpDate: string | null
  contactAttempts: number
  createdAt: string
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [qualityFilter, setQualityFilter] = useState("")
  const [sourceFilter, setSourceFilter] = useState("")
  const [convertedFilter, setConvertedFilter] = useState("")
  const [followUpFilter, setFollowUpFilter] = useState("")

  useEffect(() => {
    fetchLeads()
  }, [search, statusFilter, qualityFilter, sourceFilter, convertedFilter, followUpFilter])

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (statusFilter) params.append("status", statusFilter)
      if (qualityFilter) params.append("quality", qualityFilter)
      if (sourceFilter) params.append("source", sourceFilter)
      if (convertedFilter) params.append("converted", convertedFilter)

      const res = await fetch(`/api/leads?${params.toString()}`)
      const data = await res.json()

      // Ensure data is an array
      if (Array.isArray(data)) {
        setLeads(data)
      } else {
        console.error("API did not return an array:", data)
        setLeads([])
      }
    } catch (error) {
      console.error("Error fetching leads:", error)
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      NEW: "bg-info/10 text-info",
      CONTACTED: "bg-blue-100 text-blue-700",
      INTERESTED: "bg-purple-100 text-purple-700",
      TRIAL_SCHEDULED: "bg-yellow-100 text-yellow-700",
      TRIAL_ATTENDED: "bg-green-100 text-green-700",
      CONVERTED: "bg-success/10 text-success",
      LOST: "bg-error/10 text-error",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const getQualityBadge = (quality: string) => {
    const colors = {
      HOT: "bg-red-100 text-red-700",
      WARM: "bg-orange-100 text-orange-700",
      COLD: "bg-blue-100 text-blue-700",
    }
    return colors[quality as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const getFollowUpUrgency = (followUpDate: string | null) => {
    if (!followUpDate) return "none"

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const followUp = new Date(followUpDate)
    followUp.setHours(0, 0, 0, 0)

    const diffTime = followUp.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return "overdue" // Past date
    if (diffDays === 0) return "today" // Today
    if (diffDays <= 7) return "week" // This week
    return "future" // Future
  }

  const getFollowUpIndicator = (followUpDate: string | null) => {
    const urgency = getFollowUpUrgency(followUpDate)

    const indicators = {
      overdue: { emoji: "🔴", text: "Overdue", class: "text-red-600 font-semibold" },
      today: { emoji: "🟡", text: "Today", class: "text-amber-600 font-semibold" },
      week: { emoji: "🟢", text: "This Week", class: "text-green-600" },
      future: { emoji: "⚪", text: "", class: "text-gray-500" },
      none: { emoji: "", text: "Not set", class: "text-gray-400" },
    }

    return indicators[urgency as keyof typeof indicators] || indicators.none
  }

  // Filter and sort leads based on follow-up filter
  const filteredAndSortedLeads = leads
    .filter((lead) => {
      if (!followUpFilter) return true
      const urgency = getFollowUpUrgency(lead.followUpDate)
      return urgency === followUpFilter
    })
    .sort((a, b) => {
      // Sort by follow-up urgency
      const urgencyOrder = { overdue: 0, today: 1, week: 2, future: 3, none: 4 }
      const aUrgency = getFollowUpUrgency(a.followUpDate)
      const bUrgency = getFollowUpUrgency(b.followUpDate)
      return urgencyOrder[aUrgency as keyof typeof urgencyOrder] - urgencyOrder[bUrgency as keyof typeof urgencyOrder]
    })

  // Calculate follow-up stats
  const overdueCount = leads.filter(l => !l.converted && getFollowUpUrgency(l.followUpDate) === "overdue").length
  const todayCount = leads.filter(l => !l.converted && getFollowUpUrgency(l.followUpDate) === "today").length
  const weekCount = leads.filter(l => !l.converted && getFollowUpUrgency(l.followUpDate) === "week").length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading leads...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leads</h1>
          <p className="text-gray-500">Manage and convert leads to students</p>
        </div>
        <Link
          href="/dashboard/leads/new"
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
        >
          + Add Lead
        </Link>
      </div>

      {/* Quick Follow-up Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFollowUpFilter("")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              followUpFilter === ""
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All Leads
          </button>
          <button
            onClick={() => setFollowUpFilter("overdue")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              followUpFilter === "overdue"
                ? "bg-red-600 text-white"
                : "bg-red-50 text-red-700 hover:bg-red-100"
            }`}
          >
            🔴 Overdue {overdueCount > 0 && `(${overdueCount})`}
          </button>
          <button
            onClick={() => setFollowUpFilter("today")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              followUpFilter === "today"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            🟡 Due Today {todayCount > 0 && `(${todayCount})`}
          </button>
          <button
            onClick={() => setFollowUpFilter("week")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              followUpFilter === "week"
                ? "bg-green-600 text-white"
                : "bg-green-50 text-green-700 hover:bg-green-100"
            }`}
          >
            🟢 This Week {weekCount > 0 && `(${weekCount})`}
          </button>
          <button
            onClick={() => setFollowUpFilter("none")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              followUpFilter === "none"
                ? "bg-gray-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            ⚪ No Follow-up
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="INTERESTED">Booked</option>
              <option value="TRIAL_SCHEDULED">Trial Scheduled</option>
              <option value="TRIAL_ATTENDED">Trial Attended</option>
              <option value="CONVERTED">Converted</option>
              <option value="LOST">Lost</option>
            </select>
          </div>
          <div>
            <select
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Quality</option>
              <option value="HOT">Hot</option>
              <option value="WARM">Warm</option>
              <option value="COLD">Cold</option>
            </select>
          </div>
          <div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Sources</option>
              <option value="META_ADS">Meta Ads</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="GOOGLE">Google</option>
              <option value="ORGANIC">Organic</option>
              <option value="REFERRAL">Referral</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <select
              value={convertedFilter}
              onChange={(e) => setConvertedFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Leads</option>
              <option value="false">Not Converted</option>
              <option value="true">Converted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Leads</div>
          <div className="text-2xl font-bold text-foreground">{leads.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Hot Leads</div>
          <div className="text-2xl font-bold text-red-600">
            {leads.filter((l) => l.quality === "HOT" && !l.converted).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Converted</div>
          <div className="text-2xl font-bold text-success">
            {leads.filter((l) => l.converted).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Conversion Rate</div>
          <div className="text-2xl font-bold text-foreground">
            {leads.length > 0
              ? ((leads.filter((l) => l.converted).length / leads.length) * 100).toFixed(1)
              : 0}
            %
          </div>
        </div>
      </div>

      {/* Leads Table/Cards - Desktop: Table, Mobile: Cards */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Mobile Card View */}
        <div className="md:hidden space-y-3 p-3">
          {filteredAndSortedLeads.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-gray-500">No leads found</p>
              <Link
                href="/dashboard/leads/new"
                className="text-primary hover:text-primary-dark mt-2 inline-block"
              >
                Add your first lead
              </Link>
            </div>
          ) : (
            filteredAndSortedLeads.map((lead) => (
              <div key={lead.id} className="bg-gray-50 rounded-xl p-5 space-y-4">
                {/* Name & Badges */}
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-gray-900">{lead.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${getStatusBadge(lead.status)}`}>
                      {lead.status.replace(/_/g, " ")}
                    </span>
                    <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${getQualityBadge(lead.quality)}`}>
                      {lead.quality}
                    </span>
                    {lead.converted && lead.convertedToStudent && (
                      <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-success/10 text-success">
                        ✓ {lead.convertedToStudent.studentId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2.5 bg-white rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📱</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">{lead.whatsapp}</div>
                      <div className="text-xs text-gray-500">{lead.contactAttempts} contact attempts</div>
                    </div>
                  </div>
                  {lead.email && (
                    <div className="flex items-center gap-3 pt-2 border-t">
                      <span className="text-xl">📧</span>
                      <div className="text-sm text-gray-700 break-all">{lead.email}</div>
                    </div>
                  )}
                </div>

                {/* Follow-up & Interest */}
                {(lead.followUpDate || lead.interestedLevel) && (
                  <div className="grid grid-cols-2 gap-3">
                    {lead.followUpDate && (
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-2">Follow-up</div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">{getFollowUpIndicator(lead.followUpDate).emoji}</span>
                          <div className={`text-sm font-medium ${getFollowUpIndicator(lead.followUpDate).class}`}>
                            {formatDate(lead.followUpDate)}
                          </div>
                        </div>
                      </div>
                    )}
                    {lead.interestedLevel && (
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-2">Interested</div>
                        <div className="text-sm font-semibold text-gray-900">{lead.interestedLevel}</div>
                        {lead.interestedBatch && (
                          <div className="text-xs text-gray-600 mt-1">{lead.interestedBatch.batchCode}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Metadata */}
                <div className="text-xs text-gray-500 pt-2 border-t">
                  Added {formatDate(lead.createdAt)}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/leads/${lead.id}`}
                    className="flex-1 py-3 px-4 text-center bg-primary text-white rounded-xl text-sm font-semibold shadow-sm"
                  >
                    View Details
                  </Link>
                  {!lead.converted ? (
                    <>
                      <Link
                        href={`/dashboard/leads/${lead.id}/invoice`}
                        className="py-3 px-4 bg-primary/10 text-primary rounded-xl text-xl"
                        title="Generate Invoice"
                      >
                        📱
                      </Link>
                      <Link
                        href={`/dashboard/leads/${lead.id}/convert`}
                        className="flex-1 py-3 px-4 text-center bg-success text-white rounded-xl text-sm font-semibold shadow-sm"
                      >
                        Convert
                      </Link>
                    </>
                  ) : lead.convertedToStudent ? (
                    <Link
                      href={`/dashboard/students/${lead.convertedToStudent.id}`}
                      className="flex-1 py-3 px-4 text-center bg-info text-white rounded-xl text-sm font-semibold shadow-sm"
                    >
                      View Student
                    </Link>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Lead Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Quality
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Booked For
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Follow-up
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                    <div className="text-sm text-gray-500">
                      Added {formatDate(lead.createdAt)}
                    </div>
                    {lead.converted && lead.convertedToStudent && (
                      <div className="text-xs text-success mt-1">
                        → {lead.convertedToStudent.studentId}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{lead.whatsapp}</div>
                    {lead.email && (
                      <div className="text-sm text-gray-500">{lead.email}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      Attempts: {lead.contactAttempts}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(lead.status)}`}
                    >
                      {lead.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getQualityBadge(lead.quality)}`}
                    >
                      {lead.quality}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {lead.source.replace(/_/g, " ")}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {lead.interestedLevel && (
                      <div className="text-sm text-gray-900">{lead.interestedLevel}</div>
                    )}
                    {lead.interestedBatch && (
                      <div className="text-xs text-gray-500">
                        {lead.interestedBatch.batchCode} (
                        {lead.interestedBatch.enrolledCount}/{lead.interestedBatch.totalSeats})
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {lead.followUpDate ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getFollowUpIndicator(lead.followUpDate).emoji}</span>
                        <div>
                          <div className={`text-sm ${getFollowUpIndicator(lead.followUpDate).class}`}>
                            {formatDate(lead.followUpDate)}
                          </div>
                          {getFollowUpIndicator(lead.followUpDate).text && (
                            <div className={`text-xs ${getFollowUpIndicator(lead.followUpDate).class}`}>
                              {getFollowUpIndicator(lead.followUpDate).text}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">Not set</div>
                    )}
                    {lead.lastContactDate && (
                      <div className="text-xs text-gray-500 mt-1">
                        Last: {formatDate(lead.lastContactDate)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className="text-primary hover:text-primary-dark"
                      >
                        View
                      </Link>
                      {!lead.converted ? (
                        <>
                          <span className="text-gray-300">|</span>
                          <Link
                            href={`/dashboard/leads/${lead.id}/invoice`}
                            className="text-primary hover:text-primary/80"
                          >
                            📱
                          </Link>
                          <span className="text-gray-300">|</span>
                          <Link
                            href={`/dashboard/leads/${lead.id}/convert`}
                            className="text-success hover:text-green-700"
                          >
                            Convert
                          </Link>
                        </>
                      ) : lead.convertedToStudent ? (
                        <>
                          <span className="text-gray-300">|</span>
                          <Link
                            href={`/dashboard/students/${lead.convertedToStudent.id}`}
                            className="text-info hover:text-info/80"
                          >
                            Student
                          </Link>
                          <span className="text-gray-300">|</span>
                          <div className="inline-block">
                            <GenerateInvoiceButton
                              studentId={lead.convertedToStudent.id}
                              variant="outline"
                              showPreview={false}
                            >
                              📄
                            </GenerateInvoiceButton>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAndSortedLeads.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No leads found</p>
            <Link
              href="/dashboard/leads/new"
              className="text-primary hover:text-primary-dark mt-2 inline-block"
            >
              Add your first lead
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
