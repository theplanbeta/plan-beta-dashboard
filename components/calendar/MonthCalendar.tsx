"use client"

import { useMemo } from 'react'
import { BatchBand } from './BatchBand'
import { formatDate, getBatchGradient, calculateBatchProgress } from '@/lib/calendar-utils'

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
  teacher?: {
    name: string
  } | null
}

interface MonthCalendarProps {
  year: number
  month: number // 0-11
  batches: Batch[]
  onDateClick?: (date: Date) => void
}

interface PositionedBatch extends Batch {
  startCol: number // 1-7 (day of week)
  span: number // number of days to span
  row: number // which row to place the batch on (for stacking)
  startDay: number // day of month (1-31)
  endDay: number // day of month (1-31)
  weekRow: number // which week row (0-5)
}

// Calculate capacity for a given date
// Assumes max 2 batches per teacher (morning/evening)
function calculateDateCapacity(date: Date, batches: Batch[]) {
  // Count how many batches are running on this date
  const runningBatches = batches.filter(batch => {
    if (!batch.startDate || !batch.endDate) return false
    const start = new Date(batch.startDate)
    const end = new Date(batch.endDate)
    return date >= start && date <= end
  })

  // For now, assume total capacity based on number of unique teachers
  // Each teacher can handle 2 batches (morning/evening)
  const uniqueTeachers = new Set(runningBatches.map(b => b.teacherId).filter(Boolean))
  const used = runningBatches.length

  // Rough estimate: If we have N teachers with batches, assume total capacity is N*2 + some buffer
  // For simplicity, let's say total capacity is the number of running batches + available slots
  // This will be refined when we integrate with teacher data
  const total = Math.max(10, used + 3) // Minimum 10 total slots
  const available = total - used
  const percentage = (used / total) * 100

  return {
    used,
    total,
    available,
    percentage
  }
}

export function MonthCalendar({ year, month, batches, onDateClick }: MonthCalendarProps) {
  // Get calendar data
  const calendarData = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay() // 0 = Sunday

    // Adjust so Monday = 0, Sunday = 6
    const firstDayAdjusted = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1

    const weeks: Date[][] = []
    let currentWeek: Date[] = []

    // Add empty days before month starts
    for (let i = 0; i < firstDayAdjusted; i++) {
      currentWeek.push(new Date(year, month, -(firstDayAdjusted - i - 1)))
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(new Date(year, month, day))

      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    }

    // Add empty days after month ends
    if (currentWeek.length > 0) {
      const remaining = 7 - currentWeek.length
      for (let i = 1; i <= remaining; i++) {
        currentWeek.push(new Date(year, month + 1, i))
      }
      weeks.push(currentWeek)
    }

    return { weeks, firstDay, lastDay, daysInMonth }
  }, [year, month])

  // Position batches on the calendar
  const positionedBatches = useMemo(() => {
    const positioned: PositionedBatch[] = []

    batches.forEach(batch => {
      if (!batch.startDate || !batch.endDate) return

      const batchStart = new Date(batch.startDate)
      const batchEnd = new Date(batch.endDate)

      // Check if batch overlaps with this month
      const monthStart = calendarData.firstDay
      const monthEnd = calendarData.lastDay

      if (batchEnd < monthStart || batchStart > monthEnd) return

      // Find which weeks this batch appears in
      const weeksAppearingIn: number[] = []
      calendarData.weeks.forEach((week, weekIndex) => {
        const weekStart = week[0]
        const weekEnd = week[6]

        if (batchEnd >= weekStart && batchStart <= weekEnd) {
          weeksAppearingIn.push(weekIndex)
        }
      })

      // Create a segment for each week the batch appears in
      weeksAppearingIn.forEach(weekIndex => {
        const week = calendarData.weeks[weekIndex]
        const weekStart = week[0]
        const weekEnd = week[6]

        // Calculate start and end within this week
        const segmentStart = batchStart > weekStart ? batchStart : weekStart
        const segmentEnd = batchEnd < weekEnd ? batchEnd : weekEnd

        // Calculate start column (0-6, Monday-Sunday)
        const startCol = segmentStart.getDay() === 0 ? 6 : segmentStart.getDay() - 1

        // Calculate span in days
        const span = Math.floor((segmentEnd.getTime() - segmentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1

        positioned.push({
          ...batch,
          startCol,
          span,
          row: 0, // Will be calculated below to avoid overlaps
          startDay: segmentStart.getDate(),
          endDay: segmentEnd.getDate(),
          weekRow: weekIndex,
        })
      })
    })

    // Calculate row positions to avoid overlaps within each week
    const weekRows: Map<number, PositionedBatch[][]> = new Map()

    positioned.forEach(batch => {
      if (!weekRows.has(batch.weekRow)) {
        weekRows.set(batch.weekRow, [])
      }

      const rows = weekRows.get(batch.weekRow)!
      let placedOnRow = false

      // Try to place on an existing row
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex]
        const hasOverlap = row.some(existing => {
          const existingEnd = existing.startCol + existing.span - 1
          const batchEnd = batch.startCol + batch.span - 1
          return !(batchEnd < existing.startCol || batch.startCol > existingEnd)
        })

        if (!hasOverlap) {
          row.push(batch)
          batch.row = rowIndex
          placedOnRow = true
          break
        }
      }

      // Create new row if needed
      if (!placedOnRow) {
        batch.row = rows.length
        rows.push([batch])
      }
    })

    return positioned
  }, [batches, calendarData])

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Days of week header */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div
            key={day}
            className="px-2 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        {calendarData.weeks.map((week, weekIndex) => {
          const weekBatches = positionedBatches.filter(b => b.weekRow === weekIndex)
          const maxRow = Math.max(...weekBatches.map(b => b.row), -1) + 1
          const cellHeight = Math.max(90, 45 + maxRow * 22) // Further reduced for more compact cells

          return (
            <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700" style={{ minHeight: `${cellHeight}px` }}>
              {week.map((date, dayIndex) => {
                const isToday = isCurrentMonth && date.getDate() === today.getDate() && date.getMonth() === month
                const isCurrentMonthDay = date.getMonth() === month
                const isWeekend = dayIndex === 5 || dayIndex === 6 // Saturday or Sunday
                const dayBatches = weekBatches.filter(b => b.startCol === dayIndex)

                // Calculate capacity for this date (for current month only)
                const dateCapacity = isCurrentMonthDay ? calculateDateCapacity(date, batches) : null

                return (
                  <div
                    key={dayIndex}
                    className={`relative border-r border-gray-200 dark:border-gray-700 last:border-r-0 p-1 ${
                      isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    } ${
                      !isCurrentMonthDay ? 'bg-gray-100 dark:bg-gray-800/50 text-gray-400' : ''
                    } ${
                      isWeekend && isCurrentMonthDay ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''
                    } hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors`}
                    onClick={() => onDateClick?.(date)}
                  >
                    {/* Date number and capacity */}
                    <div className="flex items-start justify-between mb-1">
                      <div
                        className={`w-8 h-8 flex items-center justify-center text-base font-semibold rounded-full ${
                          isToday
                            ? 'bg-blue-500 text-white'
                            : isCurrentMonthDay
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-400 dark:text-gray-600'
                        }`}
                      >
                        {date.getDate()}
                      </div>

                      {/* Capacity indicator */}
                      {dateCapacity && (
                        <div className="flex flex-col items-end">
                          <div
                            className={`text-[9px] font-medium px-1 py-0.5 rounded ${
                              dateCapacity.percentage >= 80
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                : dateCapacity.percentage >= 50
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            }`}
                          >
                            {dateCapacity.used}/{dateCapacity.total}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Empty slot indicator */}
                    {dateCapacity && dateCapacity.available > 0 && dayBatches.length === 0 && isCurrentMonthDay && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-white/80 dark:bg-gray-900/80 pointer-events-none group-hover:pointer-events-auto">
                        <div className="text-center pointer-events-auto">
                          <div className="text-2xl mb-1">➕</div>
                          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {dateCapacity.available} slot{dateCapacity.available > 1 ? 's' : ''} available
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Batch bands starting on this day */}
                    {dayBatches.map((batch) => (
                      <BatchBand
                        key={`${batch.id}-${batch.weekRow}-${batch.row}`}
                        batch={batch}
                        span={batch.span}
                        row={batch.row}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
