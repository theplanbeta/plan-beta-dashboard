import { z } from 'zod'

// Validation schemas for outreach endpoints

export const completeCallSchema = z.object({
  callId: z.string().cuid(),
  duration: z.number().int().min(1).max(300).optional(), // Max 5 hours
  callNotes: z.string().min(10).max(5000),
  journeyUpdates: z.object({
    goals: z.string().optional(),
    challenges: z.string().optional(),
    wins: z.string().optional(),
    interests: z.string().optional(),
    careerPlans: z.string().optional(),
  }).optional(),
  sentiment: z.enum(['VERY_POSITIVE', 'POSITIVE', 'NEUTRAL', 'NEGATIVE', 'VERY_NEGATIVE']),
  nextCallDate: z.string().datetime().optional(), // ISO date string
  scheduleNextCall: z.boolean().default(true),
})

export const snoozeCallSchema = z.object({
  callId: z.string().cuid(),
  snoozeUntil: z.string().datetime(), // ISO date string
  snoozeReason: z.string().min(5).max(500),
  notReachable: z.boolean().default(false), // Increments attempt counter
})

export const updateCallSchema = z.object({
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  purpose: z.string().min(5).max(500).optional(),
  preCallNotes: z.string().max(2000).optional(),
  scheduledDate: z.string().datetime().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'SNOOZED', 'CANCELLED']).optional(),
})

export const createConnectionSchema = z.object({
  studentId: z.string().cuid(),
  connectedStudentId: z.string().cuid(),
  reason: z.string().min(20).max(1000),
  sendIntroduction: z.boolean().default(true),
  notes: z.string().max(1000).optional(),
})

export const scheduledCallsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD format
})

export const statsQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const suggestConnectionsQuerySchema = z.object({
  studentId: z.string().cuid(),
  limit: z.number().int().min(1).max(10).default(5),
})

// Type exports for TypeScript
export type CompleteCallInput = z.infer<typeof completeCallSchema>
export type SnoozeCallInput = z.infer<typeof snoozeCallSchema>
export type UpdateCallInput = z.infer<typeof updateCallSchema>
export type CreateConnectionInput = z.infer<typeof createConnectionSchema>
export type ScheduledCallsQuery = z.infer<typeof scheduledCallsQuerySchema>
export type StatsQuery = z.infer<typeof statsQuerySchema>
export type SuggestConnectionsQuery = z.infer<typeof suggestConnectionsQuerySchema>
