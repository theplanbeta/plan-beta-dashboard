import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { AuditAction, AuditSeverity } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sendBackupEmail } from '@/lib/email'
import { formatDateTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds timeout
export const runtime = 'nodejs'

async function performBackup(skipCooldown = false) {
  try {
    // Check if backup was done recently (within last 30 minutes) to avoid spam
    // Skip cooldown check for manual triggers
    if (!skipCooldown) {
      const recentBackup = await prisma.auditLog.findFirst({
        where: {
          description: 'Database backup completed',
          createdAt: {
            gte: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          },
        },
      })

      if (recentBackup) {
        console.log('⏭️  Backup skipped - recent backup exists:', recentBackup.createdAt)
        return NextResponse.json({
          success: true,
          message: 'Backup already created recently',
          lastBackup: recentBackup.createdAt,
          skipped: true
        })
      }
    } else {
      console.log('🔓 Manual backup - bypassing cooldown')
    }

    console.log('🔄 Starting backup...')

    // Fetch all data
    const [users, students, leads, batches, payments, referrals, attendance, invoices, auditLogs] = await Promise.all([
      prisma.user.findMany(),
      prisma.student.findMany(),
      prisma.lead.findMany(),
      prisma.batch.findMany(),
      prisma.payment.findMany(),
      prisma.referral.findMany(),
      prisma.attendance.findMany(),
      prisma.invoice.findMany(),
      prisma.auditLog.findMany({
        take: 1000, // Last 1000 audit logs
        orderBy: { createdAt: 'desc' }
      }),
    ])

    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      counts: {
        users: users.length,
        students: students.length,
        leads: leads.length,
        batches: batches.length,
        payments: payments.length,
        referrals: referrals.length,
        attendance: attendance.length,
        invoices: invoices.length,
        auditLogs: auditLogs.length,
      },
      data: {
        users,
        students,
        leads,
        batches,
        payments,
        referrals,
        attendance,
        invoices,
        auditLogs,
      }
    }

    const backupJson = JSON.stringify(backup, null, 2)

    // Save local file in development for easy verification
    if (process.env.NODE_ENV !== 'production') {
      try {
        const dir = path.join(process.cwd(), 'backups')
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
        fs.writeFileSync(path.join(dir, filename), backupJson, 'utf-8')
        console.log('📁 Local backup saved:', filename)
      } catch (e) {
        console.error('Failed to write local backup file:', e)
      }
    }

    // Send backup via email using Resend (includes full JSON as attachment)
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@planbeta.in'

    // Format timestamp for email display in Berlin timezone
    const berlinTimestamp = formatDateTime(backup.timestamp)

    const emailResult = await sendBackupEmail({
      to: supportEmail,
      counts: backup.counts,
      backupJson,
      timestamp: berlinTimestamp,
    })

    if (!emailResult.success) {
      await prisma.auditLog.create({
        data: {
          action: AuditAction.EMAIL_FAILED,
          severity: AuditSeverity.ERROR,
          description: 'Database backup email failed',
          metadata: {
            error: String(emailResult.error),
            backupCounts: backup.counts,
            timestamp: backup.timestamp,
          },
        },
      })

      return NextResponse.json(
        {
          error:
            typeof emailResult.error === 'string'
              ? emailResult.error
              : 'Failed to send backup email',
        },
        { status: 500 }
      )
    }

    await prisma.auditLog.create({
      data: {
        action: AuditAction.EMAIL_SENT,
        severity: AuditSeverity.INFO,
        description: 'Database backup completed',
        metadata: {
          backupCounts: backup.counts,
          timestamp: backup.timestamp,
          emailSentTo: supportEmail,
        },
      },
    })

    console.log('✅ Backup completed and emailed to', supportEmail, ':', backup.counts)

    return NextResponse.json({
      success: true,
      timestamp: backup.timestamp,
      counts: backup.counts,
      message: `Backup completed and emailed to ${supportEmail}. Check your inbox or spam folder.`
    })

  } catch (error) {
    console.error('❌ Backup failed:', error)

    // Log the failure
    try {
      await prisma.auditLog.create({
        data: {
          action: AuditAction.SYSTEM_ERROR,
          severity: AuditSeverity.ERROR,
          description: 'Database backup failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          metadata: { error: String(error) }
        }
      })
    } catch (logError) {
      console.error('Failed to log backup error:', logError)
    }

    return NextResponse.json(
      { error: 'Backup failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Support both GET (for Vercel Cron) and POST (for manual triggers)
// GET: Respects 30-min cooldown (automatic cron jobs)
// POST with ?manual=true: Bypasses cooldown (manual button clicks)
export async function GET(request: NextRequest) {
  return performBackup()
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const isManual = searchParams.get('manual') === 'true'
  return performBackup(isManual)
}
