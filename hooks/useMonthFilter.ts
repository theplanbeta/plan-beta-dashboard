import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"

/**
 * Format a date into a month key (YYYY-MM format)
 */
export function formatMonthKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Format a month key into a readable label (e.g., "January 2025")
 */
export function formatMonthLabel(monthKey: string): string {
  if (monthKey === 'all') return 'All Time'
  if (monthKey === 'unscheduled') return 'Unscheduled'

  const [year, month] = monthKey.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/**
 * Check if a date falls within a specific month
 */
export function isDateInMonth(date: Date | string | null | undefined, monthKey: string): boolean {
  if (!date) return false
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const dateMonthKey = formatMonthKey(dateObj)
  return dateMonthKey === monthKey
}

interface UseMonthFilterOptions<T> {
  items: T[]
  dateField: keyof T
  initialMonth?: string | null
  includeUnscheduled?: boolean
}

interface UseMonthFilterReturn<T> {
  selectedMonth: string | null
  setSelectedMonth: (month: string | null) => void
  filteredItems: T[]
  monthCounts: Record<string, number>
  sortedMonths: string[]
  clearFilter: () => void
}

/**
 * Custom hook for month-based filtering with URL state synchronization
 *
 * @param items - Array of items to filter
 * @param dateField - The date field to filter by (e.g., 'startDate', 'enrollmentDate', 'createdAt')
 * @param initialMonth - Optional initial month selection
 * @param includeUnscheduled - Whether to include items with null/undefined dates as "Unscheduled"
 */
export function useMonthFilter<T>({
  items,
  dateField,
  initialMonth = null,
  includeUnscheduled = false,
}: UseMonthFilterOptions<T>): UseMonthFilterReturn<T> {
  const router = useRouter()
  const [selectedMonth, setSelectedMonthState] = useState<string | null>(initialMonth)

  // Sync with URL query params on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const monthParam = params.get('month')
      if (monthParam) {
        setSelectedMonthState(monthParam)
      }
    }
  }, [])

  // Update URL when month selection changes
  const setSelectedMonth = (month: string | null) => {
    setSelectedMonthState(month)

    // Update URL query params
    const params = new URLSearchParams(window.location.search)
    if (month && month !== 'all') {
      params.set('month', month)
    } else {
      params.delete('month')
    }

    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`
    router.push(newUrl, { scroll: false })
  }

  // Calculate month counts and available months
  const { monthCounts, sortedMonths } = useMemo(() => {
    const counts: Record<string, number> = {}

    items.forEach((item) => {
      const date = item[dateField]

      if (!date) {
        if (includeUnscheduled) {
          counts['unscheduled'] = (counts['unscheduled'] || 0) + 1
        }
        return
      }

      const dateObj = typeof date === 'string' ? new Date(date as string) : date as unknown as Date
      const monthKey = formatMonthKey(dateObj)
      counts[monthKey] = (counts[monthKey] || 0) + 1
    })

    // Sort months chronologically
    const sorted = Object.keys(counts)
      .filter(key => key !== 'unscheduled')
      .sort((a, b) => {
        const dateA = new Date(a + '-01')
        const dateB = new Date(b + '-01')
        return dateA.getTime() - dateB.getTime()
      })

    // Add "unscheduled" at the end if it exists
    if (counts['unscheduled']) {
      sorted.push('unscheduled')
    }

    return { monthCounts: counts, sortedMonths: sorted }
  }, [items, dateField, includeUnscheduled])

  // Filter items based on selected month
  const filteredItems = useMemo(() => {
    if (!selectedMonth || selectedMonth === 'all') {
      return items
    }

    if (selectedMonth === 'unscheduled') {
      return items.filter(item => !item[dateField])
    }

    return items.filter(item => {
      const date = item[dateField]
      if (!date) return false
      return isDateInMonth(date as Date | string, selectedMonth)
    })
  }, [items, selectedMonth, dateField])

  const clearFilter = () => setSelectedMonth(null)

  return {
    selectedMonth,
    setSelectedMonth,
    filteredItems,
    monthCounts,
    sortedMonths,
    clearFilter,
  }
}
