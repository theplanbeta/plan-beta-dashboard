"use client"

import { useMemo } from 'react'
import Link from 'next/link'
import { calculateBatchProgress, getDaysRemaining, formatDate } from '@/lib/calendar-utils'

interface BatchBarProps {
  batch: {
    id: string
    batchCode: string
    level: string
    startDate: Date
    endDate: Date
    teacherId?: string | null
    status: string
    enrolledCount: number
    totalSeats: number
  }
  teacher?: {
    name: string
  } | null
  gridColumnStart: number
  gridColumnEnd: number
  clipStart?: boolean
  clipEnd?: boolean
}

export function BatchBar({
  batch,
  teacher,
  gridColumnStart,
  gridColumnEnd,
  clipStart = false,
  clipEnd = false,
}: BatchBarProps) {
  const progress = useMemo(
    () => calculateBatchProgress(batch.startDate, batch.endDate),
    [batch.startDate, batch.endDate]
  )

  const daysRemaining = useMemo(() => getDaysRemaining(batch.endDate), [batch.endDate])

  const isEnding = daysRemaining > 0 && daysRemaining <= 14
  const hasEnded = daysRemaining === 0

  // Get status color indicator
  const statusColor = useMemo(() => {
    switch (batch.status) {
      case 'RUNNING':
        return 'bg-green-500'
      case 'FILLING':
        return 'bg-yellow-500'
      case 'PLANNING':
        return 'bg-blue-500'
      case 'COMPLETED':
        return 'bg-gray-500'
      default:
        return 'bg-gray-400'
    }
  }, [batch.status])

  return (
    <Link
      href={`/dashboard/batches/${batch.id}`}
      className="group relative h-16 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"
      style={{
        gridColumn: `${gridColumnStart} / ${gridColumnEnd}`,
        background: 'linear-gradient(90deg, #10b981 0%, #fbbf24 50%, #ef4444 100%)',
      }}
      title={`${batch.batchCode} - ${teacher?.name || 'Unassigned'} - ${formatDate(batch.startDate)} to ${formatDate(batch.endDate)}`}
    >
      {/* Progress overlay - shows dark overlay up to current progress */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/10 to-transparent pointer-events-none"
        style={{
          width: `${progress}%`,
        }}
      />

      {/* Content */}
      <div className="relative h-full px-3 py-2 flex flex-col justify-between text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {/* Status indicator dot */}
              <div className={`w-2 h-2 rounded-full ${statusColor} flex-shrink-0`} />

              <p className="font-semibold text-sm truncate drop-shadow-md">
                {batch.batchCode}
              </p>
            </div>

            <p className="text-xs opacity-90 truncate drop-shadow-md">
              {teacher?.name || 'Unassigned'} • {batch.level}
            </p>
          </div>

          {/* Enrollment badge */}
          <div className="flex-shrink-0 bg-black/20 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-medium">
            {batch.enrolledCount}/{batch.totalSeats}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="opacity-90 drop-shadow-md">
            {formatDate(batch.startDate)} → {formatDate(batch.endDate)}
          </span>

          {/* Days remaining badge */}
          {!hasEnded && (
            <span
              className={`px-2 py-0.5 rounded font-medium drop-shadow-md ${
                isEnding
                  ? 'bg-red-500/80 text-white animate-pulse'
                  : 'bg-black/20 backdrop-blur-sm'
              }`}
            >
              {daysRemaining}d left
            </span>
          )}

          {hasEnded && (
            <span className="px-2 py-0.5 rounded font-medium bg-gray-500/80 text-white drop-shadow-md">
              Ended
            </span>
          )}
        </div>
      </div>

      {/* Clip indicators */}
      {clipStart && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-900/50" title="Batch started before timeline" />
      )}
      {clipEnd && (
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-900/50" title="Batch continues after timeline" />
      )}

      {/* Hover effect */}
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors pointer-events-none" />
    </Link>
  )
}
