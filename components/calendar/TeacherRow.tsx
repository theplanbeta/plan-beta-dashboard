"use client"

import { useMemo } from 'react'
import { BatchBar } from './BatchBar'
import { calculateBatchPosition, formatDate, batchEndsInMonth } from '@/lib/calendar-utils'

interface Teacher {
  id: string
  name: string
  email: string
  availableMorning?: boolean | null
  availableEvening?: boolean | null
  teacherLevels: string[]
}

interface Batch {
  id: string
  batchCode: string
  level: string
  startDate: Date | null
  endDate: Date | null
  teacherId: string | null
  status: string
  enrolledCount: number
  totalSeats: number
  schedule?: string | null
}

interface TeacherRowProps {
  teacher: Teacher
  batches: Batch[]
  timelineStart: Date
  timelineEnd: Date
  totalDays: number
  currentMonthKey?: string
}

export function TeacherRow({
  teacher,
  batches,
  timelineStart,
  timelineEnd,
  totalDays,
  currentMonthKey,
}: TeacherRowProps) {
  // Filter and prepare batches for this teacher
  const visibleBatches = useMemo(() => {
    return batches
      .filter(batch => batch.startDate && batch.endDate)
      .map(batch => {
        const position = calculateBatchPosition(
          new Date(batch.startDate!),
          new Date(batch.endDate!),
          timelineStart,
          timelineEnd
        )

        return {
          ...batch,
          ...position,
        }
      })
      .filter(batch => batch.isVisible)
  }, [batches, timelineStart, timelineEnd])

  // Calculate teacher load (0-2)
  const currentLoad = visibleBatches.filter(
    b => b.status !== 'COMPLETED' && b.status !== 'CANCELLED'
  ).length

  // Determine capability badge text
  const capabilityText = useMemo(() => {
    const parts: string[] = []

    if (teacher.teacherLevels.length > 0) {
      parts.push(teacher.teacherLevels.join('/'))
    }

    const timings: string[] = []
    if (teacher.availableMorning) timings.push('Morning')
    if (teacher.availableEvening) timings.push('Evening')

    if (timings.length > 0) {
      parts.push(timings.join('/'))
    }

    return parts.join(' • ')
  }, [teacher.teacherLevels, teacher.availableMorning, teacher.availableEvening])

  // Find batches ending this month
  const endingThisMonth = useMemo(() => {
    if (!currentMonthKey) return []
    return batches.filter(
      batch => batch.endDate && batchEndsInMonth(new Date(batch.endDate), currentMonthKey)
    )
  }, [batches, currentMonthKey])

  // Show "available" text if teacher has capacity after batch ends
  const showsAvailabilityIndicator = endingThisMonth.length > 0 && currentLoad <= 2

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      {/* Teacher header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-foreground truncate">
              {teacher.name}
            </h3>

            {/* Capability badge */}
            {capabilityText && (
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                {capabilityText}
              </span>
            )}

            {/* Load indicator */}
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${
                currentLoad === 0
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                  : currentLoad === 1
                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                  : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
              }`}
            >
              Load: {currentLoad}/2
            </span>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {teacher.email}
          </p>
        </div>

        {/* Availability indicator for ending batches */}
        {showsAvailabilityIndicator && (
          <div className="flex-shrink-0 px-3 py-1.5 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-md">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              ✓ Available after{' '}
              {formatDate(new Date(endingThisMonth[0].endDate!))}
            </p>
          </div>
        )}
      </div>

      {/* Timeline grid for batches */}
      <div
        className="relative px-4 py-4 min-h-[100px]"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${totalDays}, 1fr)`,
          gap: '4px',
        }}
      >
        {visibleBatches.length === 0 ? (
          <div className="col-span-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm italic">
            No batches in this timeline
          </div>
        ) : (
          visibleBatches.map((batch) => (
            <BatchBar
              key={batch.id}
              batch={{
                ...batch,
                startDate: new Date(batch.startDate!),
                endDate: new Date(batch.endDate!),
              }}
              teacher={teacher}
              gridColumnStart={batch.gridColumnStart}
              gridColumnEnd={batch.gridColumnEnd}
              clipStart={batch.clipStart}
              clipEnd={batch.clipEnd}
            />
          ))
        )}

        {/* Show availability gap text */}
        {showsAvailabilityIndicator && visibleBatches.length > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 text-sm font-medium text-green-600 dark:text-green-400 whitespace-nowrap pointer-events-none"
            style={{
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {teacher.name} available
          </div>
        )}
      </div>
    </div>
  )
}
