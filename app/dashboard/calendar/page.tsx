"use client"

import { useState, useEffect, useMemo } from 'react'
import { MonthCalendar } from '@/components/calendar/MonthCalendar'
import { LeadsCalendar } from '@/components/calendar/LeadsCalendar'
import { DateClickModal } from '@/components/calendar/DateClickModal'
import { BatchSuggestions } from '@/components/calendar/BatchSuggestions'
import { DayOverview } from '@/components/calendar/DayOverview'
import { TeacherStatusModal } from '@/components/calendar/TeacherStatusModal'
import { LeadDetailModal } from '@/components/calendar/LeadDetailModal'
import {
  getBatchSuggestions,
  getDayOverview,
  type TeacherWithBatches,
  type Batch as IntelligenceBatch,
  type Teacher as IntelligenceTeacher,
} from '@/lib/availability-intelligence'

interface Teacher {
  id: string
  name: string
  email: string
  teacherTimings: string[]
  teacherLevels: string[]
}

interface Batch {
  id: string
  batchCode: string
  level: string
  startDate: string | null
  endDate: string | null
  teacherId: string | null
  status: string
  enrolledCount: number
  totalSeats: number
  schedule?: string | null
}

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  status: string
  level: string
  source: string
  followUpDate: string | null
  desiredStartDate: string | null
  lastContactDate: string | null
  notes: string | null
  createdAt: string
}

type CalendarView = 'batches' | 'leads'

export default function CalendarPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<CalendarView>('batches')

  // Calendar navigation
  const [currentDate, setCurrentDate] = useState(new Date())
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  // Modal states
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showDateModal, setShowDateModal] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showDayOverview, setShowDayOverview] = useState(false)
  const [showTeacherStatus, setShowTeacherStatus] = useState(false)
  const [showLeadDetail, setShowLeadDetail] = useState(false)
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([])

  // Fetch data
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      const [teachersRes, batchesRes, leadsRes] = await Promise.all([
        fetch('/api/teachers?active=true'),
        fetch('/api/batches'),
        fetch('/api/leads'),
      ])

      if (!teachersRes.ok || !batchesRes.ok || !leadsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const teachersData = await teachersRes.json()
      const batchesData = await batchesRes.json()
      const leadsData = await leadsRes.json()

      setTeachers(teachersData)
      setBatches(batchesData)
      setLeads(leadsData)
    } catch (error) {
      console.error('Error fetching calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Convert API data to intelligence types
  const teachersWithBatches: TeacherWithBatches[] = useMemo(() => {
    return teachers.map(teacher => ({
      ...teacher,
      batches: batches
        .filter(b => b.teacherId === teacher.id)
        .map(b => ({
          ...b,
          startDate: b.startDate ? new Date(b.startDate) : null,
          endDate: b.endDate ? new Date(b.endDate) : null,
        })) as IntelligenceBatch[],
    }))
  }, [teachers, batches])

  const allBatchesConverted: IntelligenceBatch[] = useMemo(() => {
    return batches.map(b => ({
      ...b,
      startDate: b.startDate ? new Date(b.startDate) : null,
      endDate: b.endDate ? new Date(b.endDate) : null,
    })) as IntelligenceBatch[]
  }, [batches])

  // Calculate suggestions for selected date
  const suggestions = useMemo(() => {
    if (!selectedDate) return []
    return getBatchSuggestions(teachersWithBatches, selectedDate)
  }, [teachersWithBatches, selectedDate])

  // Calculate day overview for selected date
  const dayOverviewData = useMemo(() => {
    if (!selectedDate) {
      return {
        batchesRunning: [],
        teachersAvailable: [],
        teachersOccupied: [],
        totalCapacity: 0,
        usedCapacity: 0,
      }
    }
    return getDayOverview(teachersWithBatches, allBatchesConverted, selectedDate)
  }, [teachersWithBatches, allBatchesConverted, selectedDate])

  // Month navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Format month/year for display
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Handle date click
  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setShowDateModal(true)
  }

  // Handle show suggestions
  const handleShowSuggestions = () => {
    setShowSuggestions(true)
  }

  // Handle show day overview
  const handleShowDayOverview = () => {
    setShowDayOverview(true)
  }

  // Handle lead date click
  const handleLeadDateClick = (date: Date, leads: Lead[]) => {
    setSelectedDate(date)
    setSelectedLeads(leads)
    setShowLeadDetail(true)
  }

  // Prepare batches with teacher info
  const batchesWithTeachers = useMemo(() => {
    return batches.map(batch => ({
      ...batch,
      startDate: batch.startDate ? new Date(batch.startDate) : null,
      endDate: batch.endDate ? new Date(batch.endDate) : null,
      teacher: batch.teacherId ? teachers.find(t => t.id === batch.teacherId) : null,
    }))
  }, [batches, teachers])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">📅 Planning Calendar</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {currentView === 'batches'
                ? 'Monthly view of batch schedules - colors fade as batches progress'
                : 'Track lead follow-ups and desired start dates'
              }
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400">Teachers</p>
                <p className="text-lg font-bold text-foreground">{teachers.length}</p>
              </div>
              <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />
              <div className="text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400">{currentView === 'batches' ? 'Batches' : 'Leads'}</p>
                <p className="text-lg font-bold text-foreground">{currentView === 'batches' ? batches.length : leads.length}</p>
              </div>
            </div>

            {/* Teacher Status Button - Available in both views */}
            <button
              onClick={() => setShowTeacherStatus(true)}
              className="px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Teachers
            </button>

            {/* Refresh button */}
            <button
              onClick={fetchData}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* View Switcher and Month Navigation */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* View Switcher Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button
                onClick={() => setCurrentView('batches')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  currentView === 'batches'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                📊 Batches
              </button>
              <button
                onClick={() => setCurrentView('leads')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  currentView === 'leads'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                📞 Leads
              </button>
            </div>

            {/* Month Navigation */}
            <button
              onClick={goToPreviousMonth}
              className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              ← Previous
            </button>

            <h2 className="text-xl font-semibold text-foreground">{monthName}</h2>

            <button
              onClick={goToNextMonth}
              className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Next →
            </button>

            <button
              onClick={goToToday}
              className="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              Today
            </button>
          </div>

          {/* Legend - Only for batches view */}
          {currentView === 'batches' && (
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-12 h-3 rounded" style={{ background: 'linear-gradient(to right, #3b82f6 0%, rgba(59, 130, 246, 0.1) 100%)' }} />
                <span className="text-gray-600 dark:text-gray-400">Batch progress (darker = just started)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full-Width Calendar */}
      <div className="flex-1 overflow-hidden p-4">
        {currentView === 'batches' ? (
          <MonthCalendar
            year={currentYear}
            month={currentMonth}
            batches={batchesWithTeachers}
            onDateClick={handleDateClick}
          />
        ) : (
          <LeadsCalendar
            year={currentYear}
            month={currentMonth}
            leads={leads}
            onDateClick={handleLeadDateClick}
          />
        )}
      </div>

      {/* Modals */}
      <DateClickModal
        isOpen={showDateModal}
        onClose={() => setShowDateModal(false)}
        selectedDate={selectedDate}
        onShowSuggestions={handleShowSuggestions}
        onShowDayOverview={handleShowDayOverview}
        suggestionsCount={suggestions.length}
        dayOverviewData={{
          batchesRunning: dayOverviewData.batchesRunning.length,
          teachersAvailable: dayOverviewData.teachersAvailable.length,
        }}
      />

      <BatchSuggestions
        isOpen={showSuggestions}
        onClose={() => setShowSuggestions(false)}
        selectedDate={selectedDate}
        suggestions={suggestions}
      />

      <DayOverview
        isOpen={showDayOverview}
        onClose={() => setShowDayOverview(false)}
        selectedDate={selectedDate}
        data={dayOverviewData}
      />

      <TeacherStatusModal
        isOpen={showTeacherStatus}
        onClose={() => setShowTeacherStatus(false)}
        teachers={teachers}
        batches={batchesWithTeachers}
        currentMonth={currentDate}
      />

      <LeadDetailModal
        isOpen={showLeadDetail}
        onClose={() => setShowLeadDetail(false)}
        selectedDate={selectedDate}
        leads={selectedLeads}
        onShowBatchSuggestions={() => {
          setShowLeadDetail(false)
          setShowSuggestions(true)
        }}
        onShowDayOverview={() => {
          setShowLeadDetail(false)
          setShowDayOverview(true)
        }}
        suggestionsCount={suggestions.length}
        batchesRunning={dayOverviewData.batchesRunning.length}
        teachersAvailable={dayOverviewData.teachersAvailable.length}
      />
    </div>
  )
}
