"use client"

import { ReactNode, useRef, useEffect } from "react"
import { formatMonthLabel } from "@/hooks/useMonthFilter"

export interface MonthTabsProps {
  selectedMonth: string | null
  onMonthSelect: (month: string | null) => void
  monthCounts: Record<string, number>
  sortedMonths: string[]
  includeUnscheduled?: boolean
  renderStats?: (monthKey: string, count: number) => ReactNode
  maxVisibleMonths?: number
  className?: string
}

export function MonthTabs({
  selectedMonth,
  onMonthSelect,
  monthCounts,
  sortedMonths,
  includeUnscheduled = false,
  renderStats,
  maxVisibleMonths = 12,
  className = ""
}: MonthTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to selected month on mount or when selection changes
  useEffect(() => {
    if (selectedMonth && scrollContainerRef.current) {
      const selectedButton = scrollContainerRef.current.querySelector(`[data-month="${selectedMonth}"]`)
      if (selectedButton) {
        selectedButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [selectedMonth])

  // Get current month for highlighting
  const currentMonth = new Date()
  const currentMonthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`

  // Determine which months to show
  const visibleMonths = sortedMonths.filter(m => m !== 'unscheduled').slice(-maxVisibleMonths)

  const isSelected = (monthKey: string | null) => {
    if (monthKey === null) return selectedMonth === null || selectedMonth === 'all'
    return selectedMonth === monthKey
  }

  const getTabClasses = (monthKey: string | null, isCurrent: boolean = false) => {
    const isActive = isSelected(monthKey)

    const baseClasses = "px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-800"

    if (isActive) {
      return `${baseClasses} bg-primary text-white shadow-sm`
    }

    if (isCurrent) {
      return `${baseClasses} bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-2 border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30`
    }

    return `${baseClasses} bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600`
  }

  const renderTabContent = (monthKey: string | null, label: string) => {
    const count = monthKey ? monthCounts[monthKey] || 0 : Object.values(monthCounts).reduce((a, b) => a + b, 0)

    return (
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{label}</span>
          <span className="px-2 py-0.5 bg-white/20 dark:bg-black/20 rounded-full text-xs font-bold">
            {count}
          </span>
        </div>
        {renderStats && monthKey && (
          <div className="text-xs opacity-90">
            {renderStats(monthKey, count)}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Desktop: Horizontal Scrollable Tabs */}
      <div className={`hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-3 ${className}`}>
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent pb-2"
          style={{ scrollbarWidth: 'thin' }}
        >
          {/* All Time Tab */}
          <button
            onClick={() => onMonthSelect(null)}
            className={getTabClasses(null)}
            aria-label="Show all time"
          >
            {renderTabContent(null, 'All Time')}
          </button>

          {/* Unscheduled Tab */}
          {includeUnscheduled && monthCounts['unscheduled'] > 0 && (
            <button
              onClick={() => onMonthSelect('unscheduled')}
              data-month="unscheduled"
              className={getTabClasses('unscheduled')}
              aria-label="Show unscheduled items"
            >
              {renderTabContent('unscheduled', 'Unscheduled')}
            </button>
          )}

          {/* Separator */}
          {visibleMonths.length > 0 && (
            <div className="h-8 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
          )}

          {/* Month Tabs */}
          {visibleMonths.map((monthKey) => {
            const isCurrent = monthKey === currentMonthKey
            const label = formatMonthLabel(monthKey)
            // Shorten label for space (e.g., "Jan 2025" instead of "January 2025")
            const shortLabel = label.replace(/^(\w{3})\w+/, '$1')

            return (
              <button
                key={monthKey}
                onClick={() => onMonthSelect(monthKey)}
                data-month={monthKey}
                className={getTabClasses(monthKey, isCurrent)}
                aria-label={`Filter by ${label}`}
                title={label}
              >
                {renderTabContent(monthKey, shortLabel)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Mobile: Dropdown Selector */}
      <div className={`md:hidden bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filter by Month
        </label>
        <div className="relative">
          <select
            value={selectedMonth || 'all'}
            onChange={(e) => onMonthSelect(e.target.value === 'all' ? null : e.target.value)}
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none pr-10"
          >
            <option value="all">
              All Time ({Object.values(monthCounts).reduce((a, b) => a + b, 0)})
            </option>

            {includeUnscheduled && monthCounts['unscheduled'] > 0 && (
              <option value="unscheduled">
                Unscheduled ({monthCounts['unscheduled']})
              </option>
            )}

            {visibleMonths.length > 0 && includeUnscheduled && monthCounts['unscheduled'] > 0 && (
              <option disabled>──────────</option>
            )}

            {visibleMonths.map((monthKey) => {
              const isCurrent = monthKey === currentMonthKey
              const label = formatMonthLabel(monthKey)
              const count = monthCounts[monthKey] || 0

              return (
                <option key={monthKey} value={monthKey}>
                  {isCurrent ? '📅 ' : ''}{label} ({count})
                </option>
              )
            })}
          </select>

          {/* Dropdown arrow icon */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Selected Month Stats (Mobile) */}
        {renderStats && selectedMonth && selectedMonth !== 'all' && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {renderStats(selectedMonth, monthCounts[selectedMonth] || 0)}
            </div>
          </div>
        )}

        {/* Clear Filter Button */}
        {selectedMonth && selectedMonth !== 'all' && (
          <button
            onClick={() => onMonthSelect(null)}
            className="mt-3 w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            ✕ Clear Filter
          </button>
        )}
      </div>
    </>
  )
}
