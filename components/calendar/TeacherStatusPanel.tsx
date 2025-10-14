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

interface TeacherStatusPanelProps {
  teachers: Teacher[]
  batches: Batch[]
  currentMonth: Date
}

type TeacherStatus = 'available' | 'midway' | 'unavailable'

interface TeacherWithStatus extends Teacher {
  status: TeacherStatus
  activeBatchCount: number
  batchProgress?: number // average progress of their batches
}

export function TeacherStatusPanel({ teachers, batches, currentMonth }: TeacherStatusPanelProps) {
  // Calculate teacher statuses
  const teachersWithStatus = useMemo(() => {
    const today = new Date()

    return teachers.map(teacher => {
      // Find active batches for this teacher
      const activeBatches = batches.filter(batch => {
        if (!batch.startDate || !batch.endDate || batch.teacherId !== teacher.id) return false
        if (batch.status === 'COMPLETED' || batch.status === 'CANCELLED') return false

        const start = new Date(batch.startDate)
        const end = new Date(batch.endDate)
        return today >= start && today <= end
      })

      const activeBatchCount = activeBatches.length

      // Calculate average progress
      let avgProgress = 0
      if (activeBatches.length > 0) {
        const progressSum = activeBatches.reduce((sum, batch) => {
          const start = new Date(batch.startDate!).getTime()
          const end = new Date(batch.endDate!).getTime()
          const now = today.getTime()

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

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden max-w-xs">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Teacher Availability
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Real-time status
        </p>
      </div>

      {/* Teacher list */}
      <div className="max-h-[400px] overflow-y-auto">
        {/* Available */}
        {availableTeachers.length > 0 && (
          <div className="px-4 py-2">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Available ({availableTeachers.length})
            </div>
            <div className="space-y-1.5">
              {availableTeachers.map(teacher => (
                <div
                  key={teacher.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-gray-900 dark:text-gray-100 truncate flex-1">
                    {teacher.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {teacher.activeBatchCount}/2
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Midway */}
        {midwayTeachers.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              In Progress ({midwayTeachers.length})
            </div>
            <div className="space-y-1.5">
              {midwayTeachers.map(teacher => (
                <div
                  key={teacher.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-gray-900 dark:text-gray-100 truncate flex-1">
                    {teacher.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {teacher.activeBatchCount}/2
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unavailable */}
        {unavailableTeachers.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Fully Booked ({unavailableTeachers.length})
            </div>
            <div className="space-y-1.5">
              {unavailableTeachers.map(teacher => (
                <div
                  key={teacher.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-gray-900 dark:text-gray-100 truncate flex-1">
                    {teacher.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {teacher.activeBatchCount}/2
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer summary */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex justify-between text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-600 dark:text-gray-400">{availableTeachers.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-gray-600 dark:text-gray-400">{midwayTeachers.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-gray-600 dark:text-gray-400">{unavailableTeachers.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
