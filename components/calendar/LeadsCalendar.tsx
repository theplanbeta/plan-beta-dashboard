"use client"

import { useMemo } from 'react'

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

interface LeadsCalendarProps {
  year: number
  month: number // 0-11
  leads: Lead[]
  onDateClick?: (date: Date, leads: Lead[]) => void
}

interface LeadsByDate {
  [dateKey: string]: {
    followUps: Lead[]
    desiredStarts: Lead[]
  }
}

// Status color mapping
const statusColors: { [key: string]: string } = {
  INQUIRY: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  DEMO_SCHEDULED: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700',
  DEMO_COMPLETED: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700',
  FOLLOW_UP: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
  NEGOTIATION: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700',
  CONVERTED: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
  LOST: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700',
}

export function LeadsCalendar({ year, month, leads, onDateClick }: LeadsCalendarProps) {
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

  // Organize leads by date
  const leadsByDate = useMemo(() => {
    const organized: LeadsByDate = {}

    leads.forEach(lead => {
      // Add to follow-up date
      if (lead.followUpDate) {
        const followUpDate = new Date(lead.followUpDate)
        const dateKey = `${followUpDate.getFullYear()}-${followUpDate.getMonth()}-${followUpDate.getDate()}`

        if (!organized[dateKey]) {
          organized[dateKey] = { followUps: [], desiredStarts: [] }
        }
        organized[dateKey].followUps.push(lead)
      }

      // Add to desired start date
      if (lead.desiredStartDate) {
        const desiredDate = new Date(lead.desiredStartDate)
        const dateKey = `${desiredDate.getFullYear()}-${desiredDate.getMonth()}-${desiredDate.getDate()}`

        if (!organized[dateKey]) {
          organized[dateKey] = { followUps: [], desiredStarts: [] }
        }
        organized[dateKey].desiredStarts.push(lead)
      }
    })

    return organized
  }, [leads])

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
        {calendarData.weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700" style={{ minHeight: '140px' }}>
            {week.map((date, dayIndex) => {
              const isToday = isCurrentMonth && date.getDate() === today.getDate() && date.getMonth() === month
              const isCurrentMonthDay = date.getMonth() === month
              const isWeekend = dayIndex === 5 || dayIndex === 6 // Saturday or Sunday

              const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
              const dayLeads = leadsByDate[dateKey] || { followUps: [], desiredStarts: [] }
              const hasLeads = dayLeads.followUps.length > 0 || dayLeads.desiredStarts.length > 0

              return (
                <div
                  key={dayIndex}
                  className={`relative border-r border-gray-200 dark:border-gray-700 last:border-r-0 p-2 ${
                    isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  } ${
                    !isCurrentMonthDay ? 'bg-gray-100 dark:bg-gray-800/50 text-gray-400' : ''
                  } ${
                    isWeekend && isCurrentMonthDay ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''
                  } ${
                    isCurrentMonthDay ? 'hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer' : ''
                  } transition-colors`}
                  onClick={() => {
                    if (isCurrentMonthDay) {
                      const allLeads = [...dayLeads.followUps, ...dayLeads.desiredStarts]
                      // Remove duplicates
                      const uniqueLeads = Array.from(new Map(allLeads.map(l => [l.id, l])).values())
                      onDateClick?.(date, uniqueLeads)
                    }
                  }}
                >
                  {/* Date number */}
                  <div className="flex items-start justify-between mb-2">
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
                  </div>

                  {/* Lead indicators */}
                  {isCurrentMonthDay && (
                    <div className="space-y-1.5">
                      {/* Follow-ups */}
                      {dayLeads.followUps.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-md text-xs font-medium text-amber-700 dark:text-amber-300">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>{dayLeads.followUps.length}</span>
                          </div>
                        </div>
                      )}

                      {/* Desired start dates */}
                      {dayLeads.desiredStarts.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-md text-xs font-medium text-green-700 dark:text-green-300">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{dayLeads.desiredStarts.length}</span>
                          </div>
                        </div>
                      )}

                      {/* Lead previews (show first 2) */}
                      {hasLeads && (
                        <div className="mt-2 space-y-1">
                          {dayLeads.followUps.slice(0, 2).map(lead => (
                            <div
                              key={lead.id}
                              className={`text-xs px-1.5 py-1 rounded border ${statusColors[lead.status] || statusColors.INQUIRY} truncate`}
                              title={`${lead.name} - ${lead.status}`}
                            >
                              {lead.name}
                            </div>
                          ))}
                          {(dayLeads.followUps.length + dayLeads.desiredStarts.length) > 2 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-0.5">
                              +{(dayLeads.followUps.length + dayLeads.desiredStarts.length) - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
