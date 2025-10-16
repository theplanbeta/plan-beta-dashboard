'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import { PlusIcon } from '@heroicons/react/24/outline'
import HoursSummaryCards from '../components/teacher-hours/HoursSummaryCards'
import HoursListTable, { TeacherHourEntry } from '../components/teacher-hours/HoursListTable'
import LogHoursModal from '../components/teacher-hours/LogHoursModal'
import ApproveRejectModal from '../components/teacher-hours/ApproveRejectModal'
import MarkPaidModal from '../components/teacher-hours/MarkPaidModal'

interface Batch {
  id: string
  batchCode: string
  name?: string
}

interface Teacher {
  id: string
  name: string
  email: string
}

interface HoursSummary {
  pending: { count: number; totalHours: number; totalAmount: number }
  approved: { count: number; totalHours: number; totalAmount: number }
  rejected: { count: number; totalHours: number; totalAmount: number }
  paid: { count: number; totalHours: number; totalAmount: number }
}

export default function TeacherHoursPage() {
  const { data: session, status } = useSession()
  const [entries, setEntries] = useState<TeacherHourEntry[]>([])
  const [summary, setSummary] = useState<HoursSummary>({
    pending: { count: 0, totalHours: 0, totalAmount: 0 },
    approved: { count: 0, totalHours: 0, totalAmount: 0 },
    rejected: { count: 0, totalHours: 0, totalAmount: 0 },
    paid: { count: 0, totalHours: 0, totalAmount: 0 },
  })
  const [batches, setBatches] = useState<Batch[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedTeacher, setSelectedTeacher] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(true)

  // Modal states
  const [logHoursModalOpen, setLogHoursModalOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<TeacherHourEntry | null>(null)
  const [approveRejectModalOpen, setApproveRejectModalOpen] = useState(false)
  const [approveRejectEntry, setApproveRejectEntry] = useState<TeacherHourEntry | null>(null)
  const [approveRejectMode, setApproveRejectMode] = useState<'approve' | 'reject'>('approve')
  const [markPaidModalOpen, setMarkPaidModalOpen] = useState(false)
  const [markPaidEntry, setMarkPaidEntry] = useState<TeacherHourEntry | null>(null)

  const isFounder = session?.user?.role === 'FOUNDER'
  const isTeacher = session?.user?.role === 'TEACHER'
  const teacherHourlyRate = (session?.user as any)?.hourlyRate

  // Fetch hours entries
  const fetchEntries = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedTeacher) params.append('teacherId', selectedTeacher)

      // Add date range filter if month is selected
      if (selectedMonth) {
        const [year, month] = selectedMonth.split('-')
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)
        params.append('startDate', startDate.toISOString())
        params.append('endDate', endDate.toISOString())
      }

      const response = await fetch(`/api/teacher-hours?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch hours')

      const data = await response.json()
      setEntries(data || [])
    } catch (error) {
      console.error('Error fetching hours:', error)
      toast.error('Failed to load hours')
    } finally {
      setLoading(false)
    }
  }

  // Fetch summary
  const fetchSummary = async () => {
    try {
      setSummaryLoading(true)
      const params = new URLSearchParams()
      if (selectedTeacher) params.append('teacherId', selectedTeacher)

      // Add date range filter if month is selected
      if (selectedMonth) {
        const [year, month] = selectedMonth.split('-')
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)
        params.append('startDate', startDate.toISOString())
        params.append('endDate', endDate.toISOString())
      }

      const response = await fetch(`/api/teacher-hours/summary?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch summary')

      const data = await response.json()
      setSummary(data)
    } catch (error) {
      console.error('Error fetching summary:', error)
      toast.error('Failed to load summary')
    } finally {
      setSummaryLoading(false)
    }
  }

  // Fetch batches for the form
  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/batches')
      if (!response.ok) throw new Error('Failed to fetch batches')

      const data = await response.json()
      setBatches(data || [])
    } catch (error) {
      console.error('Error fetching batches:', error)
    }
  }

  // Fetch teachers for filter (founders only)
  const fetchTeachers = async () => {
    if (!isFounder) return

    try {
      const response = await fetch('/api/teachers')
      if (!response.ok) throw new Error('Failed to fetch teachers')

      const data = await response.json()
      setTeachers(data || [])
    } catch (error) {
      console.error('Error fetching teachers:', error)
    }
  }

  useEffect(() => {
    if (status === 'authenticated' && (isFounder || isTeacher)) {
      fetchBatches()
      fetchTeachers()
    }
  }, [status, isFounder, isTeacher])

  useEffect(() => {
    if (status === 'authenticated' && (isFounder || isTeacher)) {
      fetchEntries()
      fetchSummary()
    }
  }, [status, isFounder, isTeacher, selectedTeacher, selectedMonth])

  // Handle log hours (create or edit)
  const handleLogHours = () => {
    setEditEntry(null)
    setLogHoursModalOpen(true)
  }

  const handleEdit = (entry: TeacherHourEntry) => {
    setEditEntry(entry)
    setLogHoursModalOpen(true)
  }

  const handleDelete = async (entry: TeacherHourEntry) => {
    if (!confirm('Are you sure you want to delete this entry?')) return

    try {
      const response = await fetch(`/api/teacher-hours/${entry.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete entry')
      }

      toast.success('Entry deleted successfully')
      fetchEntries()
      fetchSummary()
    } catch (error) {
      console.error('Error deleting entry:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete entry')
    }
  }

  const handleApprove = (entry: TeacherHourEntry) => {
    setApproveRejectEntry(entry)
    setApproveRejectMode('approve')
    setApproveRejectModalOpen(true)
  }

  const handleReject = (entry: TeacherHourEntry) => {
    setApproveRejectEntry(entry)
    setApproveRejectMode('reject')
    setApproveRejectModalOpen(true)
  }

  const handleMarkPaid = (entry: TeacherHourEntry) => {
    setMarkPaidEntry(entry)
    setMarkPaidModalOpen(true)
  }

  const handleSuccess = () => {
    fetchEntries()
    fetchSummary()
  }

  if (status === 'loading') {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    )
  }

  if (!isFounder && !isTeacher) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Teacher Hours</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Track teacher working hours and compensation
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium">Access Denied</p>
            <p className="mt-2 text-sm">You do not have permission to access this page.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Teacher Hours</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            {isFounder
              ? 'Manage teacher working hours and compensation'
              : 'Track your working hours and view payment status'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isFounder && teachers.length > 0 && (
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Teachers</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          )}
          {isFounder && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Filter by month"
            />
          )}
          {isTeacher && (
            <button
              onClick={handleLogHours}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <PlusIcon className="h-5 w-5" />
              Log Hours
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <HoursSummaryCards summary={summary} loading={summaryLoading} />

      {/* Hours List */}
      <HoursListTable
        entries={entries}
        loading={loading}
        isFounder={isFounder}
        onEdit={isTeacher ? handleEdit : undefined}
        onDelete={isTeacher ? handleDelete : undefined}
        onApprove={isFounder ? handleApprove : undefined}
        onReject={isFounder ? handleReject : undefined}
        onMarkPaid={isFounder ? handleMarkPaid : undefined}
      />

      {/* Modals */}
      {isTeacher && (
        <LogHoursModal
          isOpen={logHoursModalOpen}
          onClose={() => {
            setLogHoursModalOpen(false)
            setEditEntry(null)
          }}
          onSuccess={handleSuccess}
          editEntry={
            editEntry
              ? {
                  id: editEntry.id,
                  batchId: editEntry.batchId,
                  date: editEntry.date,
                  hoursWorked: Number(editEntry.hoursWorked),
                  description: editEntry.description,
                }
              : null
          }
          teacherId={session?.user?.id || ''}
          teacherHourlyRate={teacherHourlyRate}
          batches={batches}
        />
      )}

      {isFounder && (
        <>
          <ApproveRejectModal
            isOpen={approveRejectModalOpen}
            onClose={() => {
              setApproveRejectModalOpen(false)
              setApproveRejectEntry(null)
            }}
            onSuccess={handleSuccess}
            entry={approveRejectEntry}
            mode={approveRejectMode}
          />

          <MarkPaidModal
            isOpen={markPaidModalOpen}
            onClose={() => {
              setMarkPaidModalOpen(false)
              setMarkPaidEntry(null)
            }}
            onSuccess={handleSuccess}
            entry={markPaidEntry}
          />
        </>
      )}
    </div>
  )
}
