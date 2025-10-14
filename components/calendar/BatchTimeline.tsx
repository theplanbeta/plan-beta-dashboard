"use client"

import { useMemo, useRef, useEffect } from 'react'
import { TeacherRow } from './TeacherRow'
import { getCalendarDateRange, getTodayPosition, isCurrentMonth } from '@/lib/calendar-utils'

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

interface TeacherWithBatches extends Teacher {
  batches: Batch[]
}

interface BatchTimelineProps {
  teachers: TeacherWithBatches[]
  allBatches: Batch[]
}

export function BatchTimeline({ teachers, allBatches }: BatchTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null)

  // Get 12-month date range (5 past + current + 6 future)
  const dateRange = useMemo(() => getCalendarDateRange(), [])

  const { months, start: timelineStart, end: timelineEnd } = dateRange

  // Calculate total days for grid
  const totalDays = useMemo(() => {
    return Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24))
  }, [timelineStart, timelineEnd])

  // Get today marker position
  const todayPosition = useMemo(() => getTodayPosition(timelineStart, timelineEnd), [timelineStart, timelineEnd])

  // Group batches by teacher
  const teachersWithBatches = useMemo(() => {
    return teachers.map(teacher => ({
      ...teacher,
      batches: allBatches.filter(b => b.teacherId === teacher.id),
    }))
  }, [teachers, allBatches])

  // Get unassigned batches
  const unassignedBatches = useMemo(() => {
    return allBatches.filter(b => !b.teacherId)
  }, [allBatches])

  // Auto-scroll to current month on mount
  useEffect(() => {
    if (timelineRef.current && todayPosition !== null) {
      const scrollPosition = (todayPosition / 100) * timelineRef.current.scrollWidth
      timelineRef.current.scrollLeft = scrollPosition - timelineRef.current.clientWidth / 2
    }
  }, [todayPosition])

  return (
    <div className="flex flex-col h-full">
      {/* Month headers */}
      <div
        ref={timelineRef}
        className="sticky top-0 z-20 bg-background border-b border-gray-300 dark:border-gray-700 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800"
      >
        <div className="flex min-w-max">
          {months.map((month) => {
            const isCurrent = isCurrentMonth(month.key)

            return (
              <div
                key={month.key}
                className={`flex-shrink-0 px-4 py-3 border-r border-gray-200 dark:border-gray-700 ${
                  isCurrent
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'bg-gray-50 dark:bg-gray-800/50'
                }`}
                style={{
                  width: `${(month.daysInMonth / totalDays) * 100}%`,
                  minWidth: '120px',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-semibold ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'}`}>
                      {month.label.split(' ')[0]}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {month.year}
                    </p>
                  </div>

                  {isCurrent && (
                    <span className="px-2 py-1 text-xs font-medium bg-blue-500 text-white rounded">
                      Current
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Timeline content with teacher rows */}
      <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
        <div className="min-w-max relative">
          {/* Today marker line */}
          {todayPosition !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-500 dark:bg-blue-400 z-10 pointer-events-none"
              style={{
                left: `${todayPosition}%`,
              }}
            >
              {/* Today label */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded whitespace-nowrap">
                Today
              </div>
            </div>
          )}

          {/* Teacher rows */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {teachersWithBatches.map((teacher) => (
              <TeacherRow
                key={teacher.id}
                teacher={teacher}
                batches={teacher.batches}
                timelineStart={timelineStart}
                timelineEnd={timelineEnd}
                totalDays={totalDays}
              />
            ))}

            {/* Unassigned batches section */}
            {unassignedBatches.length > 0 && (
              <TeacherRow
                teacher={{
                  id: 'unassigned',
                  name: 'Unassigned Batches',
                  email: 'No teacher assigned yet',
                  teacherLevels: [],
                }}
                batches={unassignedBatches}
                timelineStart={timelineStart}
                timelineEnd={timelineEnd}
                totalDays={totalDays}
              />
            )}
          </div>

          {/* Empty state */}
          {teachersWithBatches.length === 0 && unassignedBatches.length === 0 && (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <p className="text-lg font-medium">No batches found</p>
                <p className="text-sm mt-2">Create your first batch to see it on the calendar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
