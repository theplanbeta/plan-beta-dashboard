import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuditLogStats } from '@/lib/audit'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const limiter = rateLimit(RATE_LIMITS.MODERATE)

// GET /api/system/health - System health check
export async function GET(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await limiter(req)
  if (rateLimitResult) return rateLimitResult

  // Require authenticated Founder to access detailed health data
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'FOUNDER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const startTime = Date.now()
  const checks: Record<string, any> = {}

  // 1. Database Health
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = {
      status: 'healthy',
      message: 'Database connection successful',
    }
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : String(error),
    }
  }

  // 2. Database Query Performance
  try {
    const queryStart = Date.now()
    await prisma.student.count()
    const queryTime = Date.now() - queryStart

    checks.databasePerformance = {
      status: queryTime < 1000 ? 'healthy' : 'degraded',
      queryTime: `${queryTime}ms`,
      threshold: '1000ms',
    }
  } catch (error) {
    checks.databasePerformance = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error),
    }
  }

  // 3. Recent Error Rate
  try {
    const since = new Date()
    since.setHours(since.getHours() - 1) // Last hour
    const stats = await getAuditLogStats(since)

    const errorRate = stats.totalLogs > 0
      ? ((stats.errorCount + stats.criticalCount) / stats.totalLogs) * 100
      : 0

    checks.errorRate = {
      status: errorRate < 5 ? 'healthy' : errorRate < 15 ? 'warning' : 'unhealthy',
      errorRate: `${errorRate.toFixed(2)}%`,
      errors: stats.errorCount,
      critical: stats.criticalCount,
      total: stats.totalLogs,
      period: 'last 1 hour',
    }
  } catch (error) {
    checks.errorRate = {
      status: 'unknown',
      error: error instanceof Error ? error.message : String(error),
    }
  }

  // 4. System Metrics
  try {
    const [studentCount, leadCount, invoiceCount, paymentCount] = await Promise.all([
      prisma.student.count(),
      prisma.lead.count(),
      prisma.invoice.count(),
      prisma.payment.count(),
    ])

    checks.systemMetrics = {
      status: 'healthy',
      students: studentCount,
      leads: leadCount,
      invoices: invoiceCount,
      payments: paymentCount,
    }
  } catch (error) {
    checks.systemMetrics = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error),
    }
  }

  // 5. Recent Conversions (Last 24 hours)
  try {
    const last24h = new Date()
    last24h.setHours(last24h.getHours() - 24)

    const recentConversions = await prisma.lead.count({
      where: {
        converted: true,
        convertedDate: {
          gte: last24h,
        },
      },
    })

    const recentPayments = await prisma.payment.count({
      where: {
        createdAt: {
          gte: last24h,
        },
        status: 'COMPLETED',
      },
    })

    checks.recentActivity = {
      status: 'healthy',
      conversions: recentConversions,
      payments: recentPayments,
      period: 'last 24 hours',
    }
  } catch (error) {
    checks.recentActivity = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error),
    }
  }

  // Overall Health Status
  const responseTime = Date.now() - startTime
  const hasUnhealthy = Object.values(checks).some((check: any) => check.status === 'unhealthy')
  const hasWarning = Object.values(checks).some((check: any) => check.status === 'warning' || check.status === 'degraded')

  const overallStatus = hasUnhealthy ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy'

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    responseTime: `${responseTime}ms`,
    checks,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  })
}
