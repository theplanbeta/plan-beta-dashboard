import { getBatchesEndingInMonth } from "./batch-utils"

export interface TeacherWithBatches {
  id: string
  name: string
  email: string
  active: boolean
  teacherLevels: string[]
  teacherTimings: string[]
  maxConcurrentBatches?: number
  batches: Array<{
    id: string
    batchCode: string
    level: string
    startDate: string | null
    endDate: string | null
    status: string
  }>
}

export interface TeacherFreeingInfo {
  teacher: TeacherWithBatches
  availableFrom: Date
  endingBatch: {
    id: string
    batchCode: string
    level: string
    endDate: string
  }
}

export interface TeacherAvailabilityStatus {
  isAvailableNow: boolean
  currentBatchCount: number
  maxBatches: number
  availableCapacity: number
  nextAvailableDate: Date | null
  status: 'available' | 'partial' | 'full'
}

/**
 * Calculate teacher's current batch load
 */
export function calculateTeacherLoad(teacher: TeacherWithBatches): number {
  // Count only active batches (RUNNING, FILLING, FULL)
  const activeBatches = teacher.batches.filter(
    batch => ['RUNNING', 'FILLING', 'FULL'].includes(batch.status)
  )
  return activeBatches.length
}

/**
 * Get teacher's availability status
 */
export function getTeacherAvailability(teacher: TeacherWithBatches): TeacherAvailabilityStatus {
  if (!teacher.active) {
    return {
      isAvailableNow: false,
      currentBatchCount: 0,
      maxBatches: teacher.maxConcurrentBatches || 3,
      availableCapacity: 0,
      nextAvailableDate: null,
      status: 'full'
    }
  }

  const currentBatchCount = calculateTeacherLoad(teacher)
  const maxBatches = teacher.maxConcurrentBatches || 3
  const availableCapacity = maxBatches - currentBatchCount

  // Get the earliest end date from current batches
  const nextAvailableDate = teacher.batches
    .filter(batch => batch.endDate && ['RUNNING', 'FILLING', 'FULL'].includes(batch.status))
    .map(batch => new Date(batch.endDate!))
    .sort((a, b) => a.getTime() - b.getTime())[0] || null

  const isAvailableNow = availableCapacity > 0
  const status: 'available' | 'partial' | 'full' =
    currentBatchCount === 0 ? 'available' :
    availableCapacity > 0 ? 'partial' :
    'full'

  return {
    isAvailableNow,
    currentBatchCount,
    maxBatches,
    availableCapacity,
    nextAvailableDate,
    status
  }
}

/**
 * Get teachers who will become available in a specific month (due to batch endings)
 */
export function getTeachersFreeing(
  teachers: TeacherWithBatches[],
  monthKey: string
): TeacherFreeingInfo[] {
  const freeingTeachers: TeacherFreeingInfo[] = []

  teachers.forEach(teacher => {
    if (!teacher.active) return

    // Get all batches ending this month
    const endingBatches = teacher.batches.filter(batch => {
      if (!batch.endDate) return false
      const endDate = new Date(batch.endDate)
      const [year, month] = monthKey.split('-').map(Number)
      return endDate.getFullYear() === year && endDate.getMonth() + 1 === month
    })

    // Add an entry for each ending batch
    endingBatches.forEach(batch => {
      freeingTeachers.push({
        teacher,
        availableFrom: new Date(batch.endDate!),
        endingBatch: {
          id: batch.id,
          batchCode: batch.batchCode,
          level: batch.level,
          endDate: batch.endDate!
        }
      })
    })
  })

  // Sort by available date (earliest first)
  return freeingTeachers.sort((a, b) =>
    a.availableFrom.getTime() - b.availableFrom.getTime()
  )
}

/**
 * Filter teachers by level capability
 */
export function filterTeachersByLevel(
  teachers: TeacherWithBatches[],
  level: string
): TeacherWithBatches[] {
  return teachers.filter(teacher =>
    teacher.active && teacher.teacherLevels.includes(level)
  )
}

/**
 * Filter teachers by timing preference
 */
export function filterTeachersByTiming(
  teachers: TeacherWithBatches[],
  timing: string
): TeacherWithBatches[] {
  return teachers.filter(teacher =>
    teacher.active && teacher.teacherTimings.includes(timing)
  )
}

/**
 * Filter teachers by both level and timing
 */
export function filterTeachersByCapability(
  teachers: TeacherWithBatches[],
  level?: string,
  timing?: string
): TeacherWithBatches[] {
  let filtered = teachers.filter(t => t.active)

  if (level) {
    filtered = filtered.filter(t => t.teacherLevels.includes(level))
  }

  if (timing) {
    filtered = filtered.filter(t => t.teacherTimings.includes(timing))
  }

  return filtered
}

/**
 * Get available teachers (have capacity right now)
 */
export function getAvailableTeachers(
  teachers: TeacherWithBatches[],
  filters?: { level?: string; timing?: string }
): TeacherWithBatches[] {
  let filtered = teachers.filter(t => {
    const availability = getTeacherAvailability(t)
    return availability.isAvailableNow
  })

  if (filters?.level) {
    filtered = filterTeachersByLevel(filtered, filters.level)
  }

  if (filters?.timing) {
    filtered = filterTeachersByTiming(filtered, filters.timing)
  }

  return filtered
}

/**
 * Get teachers becoming available (batches ending soon)
 */
export function getBecomingAvailableTeachers(
  teachers: TeacherWithBatches[],
  monthKey: string,
  filters?: { level?: string; timing?: string }
): TeacherFreeingInfo[] {
  let freeingTeachers = getTeachersFreeing(teachers, monthKey)

  if (filters?.level) {
    freeingTeachers = freeingTeachers.filter(info =>
      info.teacher.teacherLevels.includes(filters.level!)
    )
  }

  if (filters?.timing) {
    freeingTeachers = freeingTeachers.filter(info =>
      info.teacher.teacherTimings.includes(filters.timing!)
    )
  }

  return freeingTeachers
}

/**
 * Get fully booked teachers
 */
export function getFullyBookedTeachers(
  teachers: TeacherWithBatches[],
  filters?: { level?: string; timing?: string }
): TeacherWithBatches[] {
  let filtered = teachers.filter(t => {
    const availability = getTeacherAvailability(t)
    return availability.status === 'full'
  })

  if (filters?.level) {
    filtered = filterTeachersByLevel(filtered, filters.level)
  }

  if (filters?.timing) {
    filtered = filterTeachersByTiming(filtered, filters.timing)
  }

  return filtered
}

/**
 * Get availability status badge color
 */
export function getAvailabilityBadgeColor(status: 'available' | 'partial' | 'full'): string {
  switch (status) {
    case 'available':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
    case 'partial':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
    case 'full':
      return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
  }
}

/**
 * Get availability status emoji
 */
export function getAvailabilityEmoji(status: 'available' | 'partial' | 'full'): string {
  switch (status) {
    case 'available':
      return '🟢'
    case 'partial':
      return '🟡'
    case 'full':
      return '🔴'
  }
}

/**
 * Get availability status label
 */
export function getAvailabilityLabel(status: 'available' | 'partial' | 'full'): string {
  switch (status) {
    case 'available':
      return 'Available Now'
    case 'partial':
      return 'Partially Available'
    case 'full':
      return 'Fully Booked'
  }
}
