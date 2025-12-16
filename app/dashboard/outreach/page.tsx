"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import CallCard from "@/components/outreach/CallCard"
import CallModal, { type CallOutcomeData } from "@/components/outreach/CallModal"

interface CallData {
  id: string
  studentId: string
  studentName: string
  whatsapp: string
  email: string | null
  level: string
  batch: {
    code: string
    teacher: string | undefined
  } | null
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  callType: 'URGENT' | 'CHECK_IN' | 'PAYMENT' | 'ATTENDANCE'
  reasons: string[]
  talkingPoints: string[]
  stats: {
    attendanceRate: number
    consecutiveAbsences: number
    classesAttended: number
    totalClasses: number
    paymentStatus: string
    balance: number
    churnRisk: string
  }
  lastInteraction: {
    type: string
    category: string
    date: string
    notes: string
    userName: string
  } | null
  recentAttendance: Array<{
    date: string
    status: string
  }>
}

interface CallsSummary {
  total: number
  high: number
  medium: number
  low: number
  byType: {
    urgent: number
    checkIn: number
    payment: number
    attendance: number
  }
}

export default function OutreachDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const [calls, setCalls] = useState<CallData[]>([])
  const [summary, setSummary] = useState<CallsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'today' | 'week'>('today')
  const [selectedCall, setSelectedCall] = useState<CallData | null>(null)
  const [showCallModal, setShowCallModal] = useState(false)
  const [completedToday, setCompletedToday] = useState(0)
  const [filterPriority, setFilterPriority] = useState<string>('ALL')
  const [filterType, setFilterType] = useState<string>('ALL')

  // Check authorization
  useEffect(() => {
    if (session?.user?.role !== 'FOUNDER') {
      router.push('/dashboard')
    }
  }, [session, router])

  // Fetch calls
  useEffect(() => {
    fetchCalls()
  }, [view])

  const fetchCalls = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/outreach/calls?view=${view}`)
      const data = await res.json()
      setCalls(data.calls || [])
      setSummary(data.summary || null)
    } catch (error) {
      console.error('Error fetching calls:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCallNow = (call: CallData) => {
    setSelectedCall(call)
    setShowCallModal(true)
  }

  const handleCallComplete = async (outcomeData: CallOutcomeData) => {
    // Remove the call from the list
    setCalls(calls.filter(c => c.id !== outcomeData.studentId))
    setCompletedToday(prev => prev + 1)
    setShowCallModal(false)
    setSelectedCall(null)

    // Refresh summary
    if (summary) {
      setSummary({
        ...summary,
        total: summary.total - 1
      })
    }
  }

  const handleSnooze = async (callId: string, hours: number) => {
    // In a real implementation, this would update the scheduled time
    // For now, just remove from current view
    setCalls(calls.filter(c => c.id !== callId))
    if (summary) {
      setSummary({
        ...summary,
        total: summary.total - 1
      })
    }
  }

  const handleMarkDone = async (callId: string) => {
    setCalls(calls.filter(c => c.id !== callId))
    setCompletedToday(prev => prev + 1)
    if (summary) {
      setSummary({
        ...summary,
        total: summary.total - 1
      })
    }
  }

  // Filter calls
  const filteredCalls = calls.filter(call => {
    if (filterPriority !== 'ALL' && call.priority !== filterPriority) return false
    if (filterType !== 'ALL' && call.callType !== filterType) return false
    return true
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Outreach Dashboard
          </h1>
        </div>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading your calls...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Outreach Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Connect with your students and build lasting relationships
          </p>
        </div>
        <Link
          href="/dashboard/outreach/community"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
        >
          🌐 Community Network
        </Link>
      </div>

      {/* Celebration Banner */}
      {completedToday > 0 && (
        <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-6 rounded-lg">
          <div className="text-4xl mb-2">🎉</div>
          <h2 className="text-2xl font-bold mb-1">
            Great work today!
          </h2>
          <p className="text-lg">
            You've connected with {completedToday} student{completedToday > 1 ? 's' : ''} today. Keep the momentum going!
          </p>
        </div>
      )}

      {/* Stats Summary */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="panel p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Students Looking Forward
                </p>
                <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
                  {summary.total}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="panel p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Urgent Priority
                </p>
                <p className="mt-2 text-3xl font-semibold text-red-600 dark:text-red-400">
                  {summary.high}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <span className="text-2xl">🚨</span>
              </div>
            </div>
          </div>

          <div className="panel p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Check-ins Needed
                </p>
                <p className="mt-2 text-3xl font-semibold text-yellow-600 dark:text-yellow-400">
                  {summary.byType.checkIn}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                <span className="text-2xl">💬</span>
              </div>
            </div>
          </div>

          <div className="panel p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Completed Today
                </p>
                <p className="mt-2 text-3xl font-semibold text-green-600 dark:text-green-400">
                  {completedToday}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Toggle and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 panel p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('today')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              view === 'today'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Today's Calls
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              view === 'week'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            This Week
          </button>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="select py-2"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="select py-2"
          >
            <option value="ALL">All Types</option>
            <option value="URGENT">Urgent</option>
            <option value="CHECK_IN">Check-in</option>
            <option value="PAYMENT">Payment</option>
            <option value="ATTENDANCE">Attendance</option>
          </select>
        </div>
      </div>

      {/* Calls List */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {view === 'today' ? "Today's Calls" : "This Week's Calls"} ({filteredCalls.length})
        </h2>

        {filteredCalls.length === 0 ? (
          <div className="panel p-12 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              All caught up!
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              No calls scheduled right now. Take a moment to celebrate your progress!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCalls.map(call => (
              <CallCard
                key={call.id}
                call={call}
                onCallNow={handleCallNow}
                onSnooze={handleSnooze}
                onComplete={handleMarkDone}
              />
            ))}
          </div>
        )}
      </div>

      {/* Call Modal */}
      <CallModal
        call={selectedCall}
        isOpen={showCallModal}
        onClose={() => {
          setShowCallModal(false)
          setSelectedCall(null)
        }}
        onComplete={handleCallComplete}
      />
    </div>
  )
}
