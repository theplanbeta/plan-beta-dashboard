/**
 * Calendar utilities for batch timeline visualization
 * Handles date calculations, positioning, and month range generation
 */

export interface MonthInfo {
  key: string // YYYY-MM
  label: string // "October 2025"
  year: number
  month: number // 0-11
  startDate: Date
  endDate: Date
  daysInMonth: number
}

export interface DateRange {
  start: Date
  end: Date
  months: MonthInfo[]
}

/**
 * Generate a 12-month range (5 past + current + 6 future)
 */
export function getCalendarDateRange(): DateRange {
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()

  // Start: 5 months ago
  const startDate = new Date(currentYear, currentMonth - 5, 1)

  // End: 6 months in the future (last day of that month)
  const endDate = new Date(currentYear, currentMonth + 7, 0)

  const months: MonthInfo[] = []

  // Generate month info for each month in range
  for (let i = -5; i <= 6; i++) {
    const monthDate = new Date(currentYear, currentMonth + i, 1)
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()

    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0)
    const daysInMonth = monthEnd.getDate()

    months.push({
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
      label: monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      year,
      month,
      startDate: monthStart,
      endDate: monthEnd,
      daysInMonth,
    })
  }

  return { start: startDate, end: endDate, months }
}

/**
 * Calculate the position and width of a batch bar in the timeline
 * Returns grid column span: "grid-column: start / end"
 */
export function calculateBatchPosition(
  batchStart: Date,
  batchEnd: Date,
  timelineStart: Date,
  timelineEnd: Date
): {
  gridColumnStart: number
  gridColumnEnd: number
  isVisible: boolean
  clipStart: boolean // Batch starts before timeline
  clipEnd: boolean // Batch ends after timeline
} {
  const batchStartTime = batchStart.getTime()
  const batchEndTime = batchEnd.getTime()
  const timelineStartTime = timelineStart.getTime()
  const timelineEndTime = timelineEnd.getTime()

  // Check if batch is visible in timeline
  const isVisible = batchEndTime >= timelineStartTime && batchStartTime <= timelineEndTime

  if (!isVisible) {
    return {
      gridColumnStart: 0,
      gridColumnEnd: 0,
      isVisible: false,
      clipStart: false,
      clipEnd: false,
    }
  }

  // Clamp batch dates to timeline bounds
  const clipStart = batchStartTime < timelineStartTime
  const clipEnd = batchEndTime > timelineEndTime

  const displayStart = new Date(Math.max(batchStartTime, timelineStartTime))
  const displayEnd = new Date(Math.min(batchEndTime, timelineEndTime))

  // Calculate total days in timeline
  const totalDays = Math.ceil((timelineEndTime - timelineStartTime) / (1000 * 60 * 60 * 24))

  // Calculate start day (1-indexed for CSS Grid)
  const startDay = Math.floor((displayStart.getTime() - timelineStartTime) / (1000 * 60 * 60 * 24)) + 1

  // Calculate end day (CSS Grid end is exclusive, so +1)
  const endDay = Math.floor((displayEnd.getTime() - timelineStartTime) / (1000 * 60 * 60 * 24)) + 2

  return {
    gridColumnStart: startDay,
    gridColumnEnd: Math.min(endDay, totalDays + 1),
    isVisible: true,
    clipStart,
    clipEnd,
  }
}

/**
 * Calculate progress percentage for a batch (0-100)
 */
export function calculateBatchProgress(batchStart: Date, batchEnd: Date): number {
  const now = Date.now()
  const start = batchStart.getTime()
  const end = batchEnd.getTime()

  if (now < start) return 0
  if (now > end) return 100

  const total = end - start
  const elapsed = now - start
  const progress = (elapsed / total) * 100

  return Math.min(Math.max(progress, 0), 100)
}

/**
 * Get gradient color for batch bar based on progress
 * Green (start) → Yellow (middle) → Red (end)
 */
export function getBatchGradient(progress: number): string {
  // Always show full gradient from green to red
  return 'linear-gradient(90deg, #10b981 0%, #fbbf24 50%, #ef4444 100%)'
}

/**
 * Get current position indicator within batch (0-100%)
 */
export function getCurrentPositionInBatch(batchStart: Date, batchEnd: Date): number {
  const now = Date.now()
  const start = batchStart.getTime()
  const end = batchEnd.getTime()

  if (now < start) return 0
  if (now > end) return 100

  const total = end - start
  const elapsed = now - start

  return (elapsed / total) * 100
}

/**
 * Calculate days remaining in batch
 */
export function getDaysRemaining(batchEnd: Date): number {
  const now = Date.now()
  const end = batchEnd.getTime()
  const diff = end - now

  if (diff < 0) return 0

  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Check if batch ends in a specific month
 */
export function batchEndsInMonth(batchEnd: Date, monthKey: string): boolean {
  const [year, month] = monthKey.split('-').map(Number)
  return batchEnd.getFullYear() === year && batchEnd.getMonth() + 1 === month
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Get "Today" marker position in the timeline
 */
export function getTodayPosition(timelineStart: Date, timelineEnd: Date): number | null {
  const now = Date.now()
  const start = timelineStart.getTime()
  const end = timelineEnd.getTime()

  if (now < start || now > end) return null

  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
  const daysSinceStart = Math.floor((now - start) / (1000 * 60 * 60 * 24))

  return ((daysSinceStart / totalDays) * 100)
}

/**
 * Check if a date is in the current month
 */
export function isCurrentMonth(monthKey: string): boolean {
  const today = new Date()
  const currentKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  return monthKey === currentKey
}

/**
 * Get batch duration in weeks based on level
 */
export function getBatchDurationWeeks(level: string): number {
  return (level === 'A1' || level === 'A2') ? 8 : 12
}

/**
 * Check if a batch overlaps with a date range
 */
export function batchOverlapsRange(
  batchStart: Date,
  batchEnd: Date,
  rangeStart: Date,
  rangeEnd: Date
): boolean {
  return batchEnd >= rangeStart && batchStart <= rangeEnd
}
