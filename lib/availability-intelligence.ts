/**
 * Teacher availability intelligence for batch planning
 * Provides smart suggestions for batch creation based on teacher capacity
 */

import { batchOverlapsRange } from './calendar-utils'

export interface Teacher {
  id: string
  name: string
  email: string
  teacherTimings: string[] // Array of timing strings like ['Morning', 'Evening']
  teacherLevels: string[]
}

export interface Batch {
  id: string
  batchCode: string
  level: string
  startDate: Date | null
  endDate: Date | null
  teacherId: string | null
  status: string
  schedule?: string | null
  enrolledCount: number
  totalSeats: number
}

export interface TeacherWithBatches extends Teacher {
  batches: Batch[]
}

export interface TimeSlotAvailability {
  timing: 'Morning' | 'Evening'
  available: boolean
  currentBatch?: Batch
}

export interface TeacherAvailability {
  teacher: Teacher
  morning: TimeSlotAvailability
  evening: TimeSlotAvailability
  totalLoad: number // 0, 1, or 2
  hasCapacity: boolean
}

export interface BatchSuggestion {
  teacher: Teacher
  suggestedLevel: string
  suggestedTiming: 'Morning' | 'Evening'
  feasibilityScore: number // 0-100
  reason: string
  warnings: string[]
}

/**
 * Calculate teacher availability on a specific date
 */
export function getTeacherAvailabilityOnDate(
  teacher: TeacherWithBatches,
  date: Date
): TeacherAvailability {
  const activeBatches = teacher.batches.filter(batch => {
    if (!batch.startDate || !batch.endDate) return false
    if (batch.status === 'COMPLETED' || batch.status === 'CANCELLED') return false

    const batchStart = new Date(batch.startDate)
    const batchEnd = new Date(batch.endDate)

    return date >= batchStart && date <= batchEnd
  })

  // Determine which time slots are occupied
  const morningBatch = activeBatches.find(b =>
    b.schedule?.toLowerCase().includes('morning') ||
    b.batchCode?.toLowerCase().includes('mor')
  )

  const eveningBatch = activeBatches.find(b =>
    b.schedule?.toLowerCase().includes('evening') ||
    b.batchCode?.toLowerCase().includes('eve')
  )

  // Check availability based on teacherTimings array
  // Teacher must explicitly have the timing in their array to be available
  const isMorningAvailable = teacher.teacherTimings.includes('Morning')
  const isEveningAvailable = teacher.teacherTimings.includes('Evening')

  const morning: TimeSlotAvailability = {
    timing: 'Morning',
    available: !morningBatch && isMorningAvailable,
    currentBatch: morningBatch,
  }

  const evening: TimeSlotAvailability = {
    timing: 'Evening',
    available: !eveningBatch && isEveningAvailable,
    currentBatch: eveningBatch,
  }

  const totalLoad = activeBatches.length
  const hasCapacity = totalLoad < 2 && (morning.available || evening.available)

  return {
    teacher,
    morning,
    evening,
    totalLoad,
    hasCapacity,
  }
}

/**
 * Get all available teachers on a specific date
 */
export function getAvailableTeachers(
  teachers: TeacherWithBatches[],
  date: Date
): TeacherAvailability[] {
  return teachers
    .map(teacher => getTeacherAvailabilityOnDate(teacher, date))
    .filter(availability => availability.hasCapacity)
}

/**
 * Calculate feasibility score for a batch suggestion (0-100)
 */
function calculateFeasibilityScore(
  teacher: Teacher,
  level: string,
  timing: 'Morning' | 'Evening',
  availability: TeacherAvailability
): number {
  let score = 100

  // Check if teacher can teach this level
  if (!teacher.teacherLevels.includes(level)) {
    score -= 50 // Major penalty
  }

  // Check timing preference
  const slot = timing === 'Morning' ? availability.morning : availability.evening
  if (!slot.available) {
    score -= 100 // Not available at all
  }

  // Prefer teachers with lower current load
  if (availability.totalLoad === 1) {
    score -= 10 // Small penalty for already teaching one batch
  }

  // Bonus for teachers who explicitly marked availability for this timing
  const hasTimingInPreferences = teacher.teacherTimings.includes(timing)

  if (hasTimingInPreferences) {
    score += 20 // Bonus for explicit availability
  } else {
    score -= 100 // Teacher doesn't have this timing in their preferences
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * Get batch suggestions for a specific date
 * Analyzes teacher availability and suggests feasible batch opportunities
 */
export function getBatchSuggestions(
  teachers: TeacherWithBatches[],
  date: Date
): BatchSuggestion[] {
  const suggestions: BatchSuggestion[] = []
  const availableTeachers = getAvailableTeachers(teachers, date)

  // Common levels to suggest
  const levels = ['A1', 'A2', 'B1', 'B2']

  for (const availability of availableTeachers) {
    const teacher = availability.teacher

    // Check each available time slot
    const availableSlots: ('Morning' | 'Evening')[] = []
    if (availability.morning.available) availableSlots.push('Morning')
    if (availability.evening.available) availableSlots.push('Evening')

    for (const timing of availableSlots) {
      // Suggest levels the teacher can teach
      const teachableLevels = levels.filter(level => teacher.teacherLevels.includes(level))

      for (const level of teachableLevels) {
        const score = calculateFeasibilityScore(teacher, level, timing, availability)

        if (score > 0) {
          const warnings: string[] = []

          // Add warnings
          if (availability.totalLoad === 1) {
            warnings.push('Teacher already has 1 batch running')
          }

          if (!teacher.teacherLevels.includes(level)) {
            warnings.push(`Teacher capability for ${level} not confirmed`)
          }

          const reason = buildSuggestionReason(teacher, level, timing, availability)

          suggestions.push({
            teacher,
            suggestedLevel: level,
            suggestedTiming: timing,
            feasibilityScore: score,
            reason,
            warnings,
          })
        }
      }
    }
  }

  // Sort by feasibility score (highest first)
  return suggestions.sort((a, b) => b.feasibilityScore - a.feasibilityScore)
}

/**
 * Build human-readable reason for suggestion
 */
function buildSuggestionReason(
  teacher: Teacher,
  level: string,
  timing: 'Morning' | 'Evening',
  availability: TeacherAvailability
): string {
  const parts: string[] = []

  parts.push(`${teacher.name} is available ${timing.toLowerCase()}`)

  if (teacher.teacherLevels.includes(level)) {
    parts.push(`can teach ${level}`)
  }

  if (availability.totalLoad === 0) {
    parts.push('currently not teaching any batches')
  } else if (availability.totalLoad === 1) {
    parts.push('teaching 1 batch (has 1 slot free)')
  }

  return parts.join(', ')
}

/**
 * Get teachers who will become available when batches end in a specific month
 */
export function getTeachersFreeingInMonth(
  teachers: TeacherWithBatches[],
  monthKey: string
): Array<{
  teacher: Teacher
  endingBatches: Batch[]
  availableFrom: Date
  freeSlots: ('Morning' | 'Evening')[]
}> {
  const [year, month] = monthKey.split('-').map(Number)
  const result: Array<{
    teacher: Teacher
    endingBatches: Batch[]
    availableFrom: Date
    freeSlots: ('Morning' | 'Evening')[]
  }> = []

  for (const teacher of teachers) {
    const endingBatches = teacher.batches.filter(batch => {
      if (!batch.endDate) return false
      const endDate = new Date(batch.endDate)
      return endDate.getFullYear() === year && endDate.getMonth() + 1 === month
    })

    if (endingBatches.length > 0) {
      // Find the latest end date (when teacher fully frees up)
      const latestEndDate = endingBatches.reduce((latest, batch) => {
        const endDate = new Date(batch.endDate!)
        return endDate > latest ? endDate : latest
      }, new Date(0))

      // Determine which slots are freeing up
      const freeSlots: ('Morning' | 'Evening')[] = []
      endingBatches.forEach(batch => {
        if (batch.schedule?.toLowerCase().includes('morning') || batch.batchCode?.toLowerCase().includes('mor')) {
          if (!freeSlots.includes('Morning')) freeSlots.push('Morning')
        }
        if (batch.schedule?.toLowerCase().includes('evening') || batch.batchCode?.toLowerCase().includes('eve')) {
          if (!freeSlots.includes('Evening')) freeSlots.push('Evening')
        }
      })

      result.push({
        teacher,
        endingBatches,
        availableFrom: latestEndDate,
        freeSlots,
      })
    }
  }

  // Sort by availability date (earliest first)
  return result.sort((a, b) => a.availableFrom.getTime() - b.availableFrom.getTime())
}

/**
 * Check if teacher is overloaded (>2 batches running simultaneously)
 */
export function isTeacherOverloaded(
  teacher: TeacherWithBatches,
  date: Date
): boolean {
  const availability = getTeacherAvailabilityOnDate(teacher, date)
  return availability.totalLoad > 2
}

/**
 * Get day-level overview of all batches and availability
 */
export function getDayOverview(
  teachers: TeacherWithBatches[],
  batches: Batch[],
  date: Date
): {
  batchesRunning: Batch[]
  teachersAvailable: Teacher[]
  teachersOccupied: Teacher[]
  totalCapacity: number
  usedCapacity: number
} {
  const batchesRunning = batches.filter(batch => {
    if (!batch.startDate || !batch.endDate) return false
    const start = new Date(batch.startDate)
    const end = new Date(batch.endDate)
    return date >= start && date <= end
  })

  const availabilities = teachers.map(t => getTeacherAvailabilityOnDate(t, date))
  const teachersAvailable = availabilities.filter(a => a.hasCapacity).map(a => a.teacher)
  const teachersOccupied = availabilities.filter(a => !a.hasCapacity).map(a => a.teacher)

  const totalCapacity = teachers.length * 2 // 2 slots per teacher
  const usedCapacity = availabilities.reduce((sum, a) => sum + a.totalLoad, 0)

  return {
    batchesRunning,
    teachersAvailable,
    teachersOccupied,
    totalCapacity,
    usedCapacity,
  }
}
