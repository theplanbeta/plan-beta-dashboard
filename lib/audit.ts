import { prisma } from '@/lib/prisma'
import { AuditAction, AuditSeverity } from '@prisma/client'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export interface AuditLogData {
  action: AuditAction
  severity?: AuditSeverity
  description: string
  entityType?: string
  entityId?: string
  metadata?: any
  errorMessage?: string
  errorStack?: string
  request?: NextRequest
}

// Redact sensitive fields from metadata before persisting
function sanitizeMetadata(input: any, depth: number = 0): any {
  if (input == null) return input
  if (depth > 3) return '[Truncated]'

  const SENSITIVE_KEYS = [
    'password',
    'pass',
    'secret',
    'token',
    'apiKey',
    'apikey',
    'authorization',
    'authorizationHeader',
    'resendApiKey',
    'dsn',
  ]

  const redact = (val: any) => (typeof val === 'string' && val.length > 0 ? '[REDACTED]' : null)

  if (Array.isArray(input)) {
    return input.map((v) => sanitizeMetadata(v, depth + 1))
  }

  if (typeof input === 'object') {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(input)) {
      if (SENSITIVE_KEYS.includes(k.toLowerCase())) {
        out[k] = redact(v)
      } else {
        out[k] = sanitizeMetadata(v, depth + 1)
      }
    }
    return out
  }

  return input
}

/**
 * Create an audit log entry
 * This function captures all critical actions in the system for monitoring and compliance
 */
export async function createAuditLog(data: AuditLogData) {
  try {
    // Get user session if available
    const session = await getServerSession(authOptions)

    // Extract request details
    let ipAddress: string | null = null
    let userAgent: string | null = null
    let requestPath: string | null = null
    let requestMethod: string | null = null

    if (data.request) {
      // Extract IP address (supports various proxy headers)
      ipAddress =
        data.request.headers.get('x-forwarded-for')?.split(',')[0] ||
        data.request.headers.get('x-real-ip') ||
        data.request.headers.get('cf-connecting-ip') || // Cloudflare
        null

      userAgent = data.request.headers.get('user-agent')
      requestPath = data.request.nextUrl.pathname
      requestMethod = data.request.method
    }

    // Create audit log entry
    const auditLog = await prisma.auditLog.create({
      data: {
        action: data.action,
        severity: data.severity || AuditSeverity.INFO,
        description: data.description,

        // User information
        userId: session?.user?.id || null,
        userEmail: session?.user?.email || null,
        userName: session?.user?.name || null,

        // Request context
        ipAddress,
        userAgent,
        requestPath,
        requestMethod,

        // Entity information
        entityType: data.entityType || null,
        entityId: data.entityId || null,

        // Additional data (sanitized)
        metadata: data.metadata ? sanitizeMetadata(data.metadata) : null,

        // Error tracking
        errorMessage: data.errorMessage || null,
        errorStack: data.errorStack || null,
      },
    })

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 Audit Log:', {
        action: data.action,
        severity: data.severity || 'INFO',
        user: session?.user?.email || 'Anonymous',
        description: data.description,
      })
    }

    return auditLog
  } catch (error) {
    // If audit logging fails, log to console but don't crash the application
    console.error('❌ Failed to create audit log:', error)
    console.error('Audit log data:', data)

    // In production, you might want to send this to an external monitoring service
    // like Sentry or DataDog
    return null
  }
}

/**
 * Helper function to log successful actions
 */
export async function logSuccess(
  action: AuditAction,
  description: string,
  options?: {
    entityType?: string
    entityId?: string
    metadata?: any
    request?: NextRequest
  }
) {
  return createAuditLog({
    action,
    severity: AuditSeverity.INFO,
    description,
    ...options,
  })
}

/**
 * Helper function to log warnings
 */
export async function logWarning(
  action: AuditAction,
  description: string,
  options?: {
    entityType?: string
    entityId?: string
    metadata?: any
    request?: NextRequest
  }
) {
  return createAuditLog({
    action,
    severity: AuditSeverity.WARNING,
    description,
    ...options,
  })
}

/**
 * Helper function to log errors
 */
export async function logError(
  action: AuditAction,
  description: string,
  error: Error | unknown,
  options?: {
    entityType?: string
    entityId?: string
    metadata?: any
    request?: NextRequest
  }
) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  return createAuditLog({
    action,
    severity: AuditSeverity.ERROR,
    description,
    errorMessage,
    errorStack,
    ...options,
  })
}

/**
 * Helper function to log critical errors
 */
export async function logCritical(
  action: AuditAction,
  description: string,
  error: Error | unknown,
  options?: {
    entityType?: string
    entityId?: string
    metadata?: any
    request?: NextRequest
  }
) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  return createAuditLog({
    action,
    severity: AuditSeverity.CRITICAL,
    description,
    errorMessage,
    errorStack,
    ...options,
  })
}

/**
 * Get recent audit logs
 */
export async function getRecentAuditLogs(limit: number = 100) {
  return prisma.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get audit logs for a specific entity
 */
export async function getEntityAuditLogs(entityType: string, entityId: string) {
  return prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get audit logs by severity
 */
export async function getAuditLogsBySeverity(severity: AuditSeverity, limit: number = 100) {
  return prisma.auditLog.findMany({
    where: { severity },
    take: limit,
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get error logs (ERROR + CRITICAL)
 */
export async function getErrorLogs(limit: number = 100) {
  return prisma.auditLog.findMany({
    where: {
      severity: {
        in: [AuditSeverity.ERROR, AuditSeverity.CRITICAL],
      },
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get audit logs by user
 */
export async function getUserAuditLogs(userId: string, limit: number = 100) {
  return prisma.auditLog.findMany({
    where: { userId },
    take: limit,
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(since?: Date) {
  const whereClause = since ? { createdAt: { gte: since } } : {}

  const [
    totalLogs,
    errorCount,
    warningCount,
    criticalCount,
    actionCounts,
  ] = await Promise.all([
    prisma.auditLog.count({ where: whereClause }),
    prisma.auditLog.count({
      where: { ...whereClause, severity: AuditSeverity.ERROR },
    }),
    prisma.auditLog.count({
      where: { ...whereClause, severity: AuditSeverity.WARNING },
    }),
    prisma.auditLog.count({
      where: { ...whereClause, severity: AuditSeverity.CRITICAL },
    }),
    prisma.auditLog.groupBy({
      by: ['action'],
      where: whereClause,
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
      take: 10,
    }),
  ])

  return {
    totalLogs,
    errorCount,
    warningCount,
    criticalCount,
    topActions: actionCounts.map((a) => ({
      action: a.action,
      count: a._count.action,
    })),
  }
}
