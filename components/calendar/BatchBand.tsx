"use client"

import { useMemo } from 'react'
import Link from 'next/link'
import { calculateBatchProgress, getDaysRemaining } from '@/lib/calendar-utils'

interface BatchBandProps {
  batch: {
    id: string
    batchCode: string
    level: string
    startDate: Date | null
    endDate: Date | null
    status: string
    enrolledCount: number
    totalSeats: number
    schedule?: string | null
    teacher?: {
      name: string
    } | null
  }
  span: number // number of days to span across
  row: number // which row (for vertical positioning)
}

// Generate a unique consistent color for each batch based on its ID
function getBatchColor(batchId: string): string {
  // Color palette with good contrast and visibility
  const colors = [
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#f97316', // orange
    '#10b981', // emerald
    '#06b6d4', // cyan
    '#f59e0b', // amber
    '#ef4444', // red
    '#6366f1', // indigo
    '#14b8a6', // teal
    '#a855f7', // purple
    '#f43f5e', // rose
  ]

  // Simple hash function to get consistent color for batch ID
  let hash = 0
  for (let i = 0; i < batchId.length; i++) {
    hash = batchId.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

export function BatchBand({ batch, span, row }: BatchBandProps) {
  if (!batch.startDate || !batch.endDate) return null

  const progress = useMemo(
    () => calculateBatchProgress(new Date(batch.startDate!), new Date(batch.endDate!)),
    [batch.startDate, batch.endDate]
  )

  const daysRemaining = useMemo(
    () => getDaysRemaining(new Date(batch.endDate!)),
    [batch.endDate]
  )

  const isEnding = daysRemaining > 0 && daysRemaining <= 14
  const hasEnded = daysRemaining === 0

  // Format end date
  const endDateFormatted = new Date(batch.endDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })

  // Detect timing from batch code or schedule
  const timing = batch.batchCode?.toLowerCase().includes('mor') || batch.schedule?.toLowerCase().includes('morning')
    ? 'morning'
    : batch.batchCode?.toLowerCase().includes('eve') || batch.schedule?.toLowerCase().includes('evening')
    ? 'evening'
    : null

  // Get batch color and calculate opacity based on progress (100% at start, 10% at end)
  const batchColor = getBatchColor(batch.id)
  const opacity = 1 - (progress / 100) * 0.9 // 1.0 to 0.1

  return (
    <Link
      href={`/dashboard/batches/${batch.id}`}
      className="absolute left-0 right-0 group"
      style={{
        top: `${30 + row * 22}px`, // Start below the date number, stack vertically (further reduced)
        height: '20px', // Even more compact
        width: `calc(${span * 100}% + ${(span - 1) * 1}px)`, // Span across columns, accounting for borders
        zIndex: 10 + row,
      }}
    >
      <div
        className="h-full rounded overflow-hidden shadow-sm hover:shadow-md transition-all border border-white/20 relative"
        style={{
          backgroundColor: batchColor,
          opacity: opacity,
        }}
      >

        {/* Content */}
        <div className="relative h-full px-1 flex items-center justify-between text-white text-[10px]">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {/* Morning/Evening indicator */}
            {timing && (
              <span className="text-[10px] flex-shrink-0" title={timing === 'morning' ? 'Morning batch' : 'Evening batch'}>
                {timing === 'morning' ? '☀️' : '🌙'}
              </span>
            )}

            {/* Batch code + Teacher */}
            <span className="font-semibold truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {batch.batchCode} - {batch.teacher?.name || 'Unassigned'}
            </span>

            {/* Level badge */}
            <span className="px-0.5 py-0 bg-white/20 backdrop-blur-sm rounded text-[8px] font-medium flex-shrink-0">
              {batch.level}
            </span>
          </div>

          {/* Right side info */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Enrollment */}
            <span className="px-0.5 py-0 bg-white/20 backdrop-blur-sm rounded text-[8px] font-medium">
              {batch.enrolledCount}/{batch.totalSeats}
            </span>

            {/* End date */}
            {!hasEnded && (
              <span
                className={`px-0.5 py-0 rounded text-[8px] font-medium whitespace-nowrap ${
                  isEnding
                    ? 'bg-red-600/90 text-white animate-pulse'
                    : 'bg-white/20 backdrop-blur-sm'
                }`}
              >
                Ends {endDateFormatted}
              </span>
            )}

            {hasEnded && (
              <span className="px-0.5 py-0 rounded text-[8px] font-medium bg-gray-600/90 text-white">
                Ended
              </span>
            )}
          </div>
        </div>

        {/* Hover effect with tooltip info */}
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors pointer-events-none" />

        {/* Tooltip on hover */}
        <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50 bg-gray-900 text-white text-xs rounded-lg shadow-xl p-2 min-w-[200px]">
          <div className="space-y-1">
            <div className="font-semibold border-b border-gray-700 pb-1">
              {batch.batchCode}
            </div>
            <div>Teacher: {batch.teacher?.name || 'Unassigned'}</div>
            <div>Level: {batch.level}</div>
            <div>Students: {batch.enrolledCount}/{batch.totalSeats}</div>
            {batch.startDate && <div>Start: {new Date(batch.startDate).toLocaleDateString()}</div>}
            {batch.endDate && <div>End: {new Date(batch.endDate).toLocaleDateString()}</div>}
            <div>Progress: {progress}%</div>
            {!hasEnded && <div>Days remaining: {daysRemaining}</div>}
          </div>
        </div>
      </div>
    </Link>
  )
}
