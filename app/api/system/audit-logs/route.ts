import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRecentAuditLogs, getErrorLogs, getAuditLogStats } from '@/lib/audit'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const limiter = rateLimit(RATE_LIMITS.MODERATE)

// GET /api/system/audit-logs - Get audit logs
export async function GET(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await limiter(req)
    if (rateLimitResult) return rateLimitResult

    const session = await getServerSession(authOptions)

    // Only FOUNDER can access audit logs
    if (!session?.user || session.user.role !== 'FOUNDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')

    let logs
    let stats

    switch (type) {
      case 'errors':
        logs = await getErrorLogs(limit)
        break
      case 'stats':
        // Get stats for last 24 hours
        const since = new Date()
        since.setHours(since.getHours() - 24)
        stats = await getAuditLogStats(since)
        return NextResponse.json({ stats })
      default:
        logs = await getRecentAuditLogs(limit)
    }

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
