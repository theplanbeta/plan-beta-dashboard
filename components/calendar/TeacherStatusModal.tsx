"use client"

import { useMemo } from 'react'

interface Teacher {
  id: string
  name: string
  email: string
}

interface Batch {
  id: string
  startDate: Date | null
  endDate: Date | null
  teacherId: string | null
  status: string
}

interface TeacherStatusModalProps {
  isOpen: boolean
  onClose: () => void
  teachers: Teacher[]
  batches: Batch[]
  currentMonth: Date
}

type TeacherStatus = 'available' | 'midway' | 'unavailable'

interface TeacherWithStatus extends Teacher {
  status: TeacherStatus
  activeBatchCount: number
  batchProgress?: number
}

export function TeacherStatusModal({ isOpen, onClose, teachers, batches, currentMonth }: TeacherStatusModalProps) {
  // Calculate teacher statuses
  const teachersWithStatus = useMemo(() => {
    // Use the currently viewed month instead of today
    const referenceDate = new Date(currentMonth)
    // Use middle of the month as reference point
    referenceDate.setDate(15)

    return teachers.map(teacher => {
      // Find active batches for this teacher in the viewed month
      const activeBatches = batches.filter(batch => {
        if (!batch.startDate || !batch.endDate || batch.teacherId !== teacher.id) return false
        if (batch.status === 'COMPLETED' || batch.status === 'CANCELLED') return false

        const start = new Date(batch.startDate)
        const end = new Date(batch.endDate)
        return referenceDate >= start && referenceDate <= end
      })

      const activeBatchCount = activeBatches.length

      // Calculate average progress based on reference date
      let avgProgress = 0
      if (activeBatches.length > 0) {
        const progressSum = activeBatches.reduce((sum, batch) => {
          const start = new Date(batch.startDate!).getTime()
          const end = new Date(batch.endDate!).getTime()
          const now = referenceDate.getTime()

          const total = end - start
          const elapsed = now - start
          const progress = Math.max(0, Math.min(100, (elapsed / total) * 100))

          return sum + progress
        }, 0)
        avgProgress = progressSum / activeBatches.length
      }

      // Determine status
      let status: TeacherStatus = 'available'
      if (activeBatchCount === 0) {
        status = 'available'
      } else if (activeBatchCount === 2) {
        status = 'unavailable' // Fully booked (2 batches)
      } else if (avgProgress < 30) {
        status = 'unavailable' // Batch just started
      } else if (avgProgress >= 30 && avgProgress < 70) {
        status = 'midway' // Batch midway
      } else {
        status = 'midway' // Nearing completion
      }

      return {
        ...teacher,
        status,
        activeBatchCount,
        batchProgress: activeBatches.length > 0 ? avgProgress : undefined,
      }
    })
  }, [teachers, batches, currentMonth])

  // Group by status
  const availableTeachers = teachersWithStatus.filter(t => t.status === 'available')
  const midwayTeachers = teachersWithStatus.filter(t => t.status === 'midway')
  const unavailableTeachers = teachersWithStatus.filter(t => t.status === 'unavailable')

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl overflow-hidden w-full max-w-md pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Teacher Availability
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - mid-month status
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Teacher list */}
          <div className="max-h-[500px] overflow-y-auto">
            {/* Available */}
            {availableTeachers.length > 0 && (
              <div className="px-6 py-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  Available ({availableTeachers.length})
                </div>
                <div className="space-y-2">
                  {availableTeachers.map(teacher => (
                    <div
                      key={teacher.id}
                      className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {teacher.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            No active batches
                          </div>
                        </div>
                      </div>
                      <div className="text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded">
                        {teacher.activeBatchCount}/2
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Midway */}
            {midwayTeachers.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  In Progress ({midwayTeachers.length})
                </div>
                <div className="space-y-2">
                  {midwayTeachers.map(teacher => (
                    <div
                      key={teacher.id}
                      className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {teacher.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {teacher.batchProgress ? `${Math.round(teacher.batchProgress)}% complete` : 'In progress'}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded">
                        {teacher.activeBatchCount}/2
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unavailable */}
            {unavailableTeachers.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  Fully Booked ({unavailableTeachers.length})
                </div>
                <div className="space-y-2">
                  {unavailableTeachers.map(teacher => (
                    <div
                      key={teacher.id}
                      className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {teacher.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {teacher.batchProgress && teacher.batchProgress < 30 ? 'Just started' : 'Fully occupied'}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded">
                        {teacher.activeBatchCount}/2
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer summary */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex justify-around text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-gray-600 dark:text-gray-400 font-medium">{availableTeachers.length} Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-gray-600 dark:text-gray-400 font-medium">{midwayTeachers.length} In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-gray-600 dark:text-gray-400 font-medium">{unavailableTeachers.length} Booked</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
