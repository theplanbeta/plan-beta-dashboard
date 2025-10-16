import { formatMonthKey } from "@/hooks/useMonthFilter"

export interface BatchWithDates {
  id: string
  startDate: string | null
  endDate: string | null
  status: string
  [key: string]: any
}

/**
 * Calculate the progress percentage of a batch based on start and end dates
 * Returns a number between 0 and 100
 */
export function calculateBatchProgress(batch: BatchWithDates): number {
  if (!batch.startDate || !batch.endDate) return 0

  const start = new Date(batch.startDate).getTime()
  const end = new Date(batch.endDate).getTime()
  const now = Date.now()

  // If batch hasn't started yet
  if (now < start) return 0

  // If batch has already ended
  if (now > end) return 100

  // Calculate percentage
  const totalDuration = end - start
  const elapsed = now - start
  const progress = (elapsed / totalDuration) * 100

  return Math.min(Math.max(progress, 0), 100)
}

/**
 * Get the number of days remaining until batch ends
 * Returns negative number if batch has already ended
 */
export function getDaysRemaining(batch: BatchWithDates): number | null {
  if (!batch.endDate) return null

  const end = new Date(batch.endDate).getTime()
  const now = Date.now()
  const diffTime = end - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Get the number of days since batch started
 * Returns negative number if batch hasn't started yet
 */
export function getDaysSinceStart(batch: BatchWithDates): number | null {
  if (!batch.startDate) return null

  const start = new Date(batch.startDate).getTime()
  const now = Date.now()
  const diffTime = now - start
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Check if a batch is ending within the specified number of days
 */
export function isEndingSoon(batch: BatchWithDates, daysThreshold: number = 14): boolean {
  const daysRemaining = getDaysRemaining(batch)
  if (daysRemaining === null) return false
  return daysRemaining > 0 && daysRemaining <= daysThreshold
}

/**
 * Check if a batch is ending in a specific month
 */
export function isEndingInMonth(batch: BatchWithDates, monthKey: string): boolean {
  if (!batch.endDate) return false

  const endDate = new Date(batch.endDate)
  const batchEndMonth = formatMonthKey(endDate)

  return batchEndMonth === monthKey
}

/**
 * Check if a batch is starting in a specific month
 */
export function isStartingInMonth(batch: BatchWithDates, monthKey: string): boolean {
  if (!batch.startDate) return false

  const startDate = new Date(batch.startDate)
  const batchStartMonth = formatMonthKey(startDate)

  return batchStartMonth === monthKey
}

/**
 * Check if a batch is running (ongoing) during a specific month
 * A batch is running if it starts before or during the month and ends after or during the month
 */
export function isRunningInMonth(batch: BatchWithDates, monthKey: string): boolean {
  if (!batch.startDate || !batch.endDate) return false

  const [year, month] = monthKey.split('-').map(Number)
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0) // Last day of the month

  const batchStart = new Date(batch.startDate)
  const batchEnd = new Date(batch.endDate)

  // Batch is running if it starts before month ends and ends after month starts
  return batchStart <= monthEnd && batchEnd >= monthStart
}

/**
 * Get the lifecycle stage of a batch
 */
export function getBatchLifecycleStage(batch: BatchWithDates): 'not-started' | 'running' | 'ended' {
  if (!batch.startDate) return 'not-started'

  const start = new Date(batch.startDate).getTime()
  const now = Date.now()

  // If batch hasn't started
  if (now < start) return 'not-started'

  // If batch has an end date and has ended
  if (batch.endDate) {
    const end = new Date(batch.endDate).getTime()
    if (now > end) return 'ended'
  }

  return 'running'
}

/**
 * Get color class for batch lifecycle stage
 */
export function getLifecycleColor(batch: BatchWithDates): string {
  const stage = getBatchLifecycleStage(batch)

  switch (stage) {
    case 'not-started':
      return 'text-gray-600 dark:text-gray-400'
    case 'running':
      return 'text-blue-600 dark:text-blue-400'
    case 'ended':
      return 'text-gray-500 dark:text-gray-500'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
}

/**
 * Get progress bar color class based on batch progress
 */
export function getProgressBarColor(progress: number): string {
  if (progress >= 75) return 'bg-gradient-to-r from-blue-500 to-green-500'
  if (progress >= 50) return 'bg-gradient-to-r from-green-500 to-blue-500'
  if (progress >= 25) return 'bg-gradient-to-r from-yellow-500 to-green-500'
  return 'bg-gradient-to-r from-gray-500 to-yellow-500'
}

/**
 * Format days remaining into a human-readable string
 */
export function formatDaysRemaining(days: number | null): string {
  if (days === null) return 'No end date'
  if (days < 0) return 'Ended'
  if (days === 0) return 'Ends today'
  if (days === 1) return '1 day left'
  return `${days} days left`
}

/**
 * Get batches that are ending in a specific month
 */
export function getBatchesEndingInMonth<T extends BatchWithDates>(
  batches: T[],
  monthKey: string
): T[] {
  return batches.filter(batch => isEndingInMonth(batch, monthKey))
}

/**
 * Get batches that are starting in a specific month
 */
export function getBatchesStartingInMonth<T extends BatchWithDates>(
  batches: T[],
  monthKey: string
): T[] {
  return batches.filter(batch => isStartingInMonth(batch, monthKey))
}

/**
 * Get batches that are running during a specific month
 */
export function getBatchesRunningInMonth<T extends BatchWithDates>(
  batches: T[],
  monthKey: string
): T[] {
  return batches.filter(batch => isRunningInMonth(batch, monthKey))
}

/**
 * Get month statistics for batches
 */
export interface BatchMonthStats {
  starting: number
  ending: number
  running: number
  total: number
}

export function getBatchMonthStats(
  batches: BatchWithDates[],
  monthKey: string
): BatchMonthStats {
  const starting = getBatchesStartingInMonth(batches, monthKey).length
  const ending = getBatchesEndingInMonth(batches, monthKey).length
  const running = getBatchesRunningInMonth(batches, monthKey).length

  return {
    starting,
    ending,
    running,
    total: batches.filter(b => {
      if (!b.startDate) return false
      return formatMonthKey(new Date(b.startDate)) === monthKey
    }).length
  }
}
