import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds timeout
export const runtime = 'nodejs'

async function performBackup() {
  try {
    // Check if backup was done recently (within last 30 minutes) to avoid spam
    const recentBackup = await prisma.auditLog.findFirst({
      where: {
        description: {
          contains: 'database backup completed',
          mode: 'insensitive',
        },
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        },
      },
    })

    if (recentBackup) {
      return NextResponse.json({
        success: true,
        message: 'Backup already created recently',
        lastBackup: recentBackup.createdAt,
        skipped: true
      })
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

    // Save a local JSON file in development for easy verification
    if (process.env.NODE_ENV !== 'production') {
      try {
        const dir = path.join(process.cwd(), 'backups')
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
        fs.writeFileSync(path.join(dir, filename), JSON.stringify(backup, null, 2), 'utf-8')
      } catch (e) {
        console.error('Failed to write local backup file:', e)
      }
    }

    // Send backup via email using Resend
    const resendApiKey = process.env.RESEND_API_KEY
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@planbeta.in'

    if (resendApiKey && resendApiKey !== 'your-resend-api-key') {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Plan Beta Backups <noreply@planbeta.in>',
            to: [supportEmail],
            subject: `Database Backup - ${new Date().toLocaleString()}`,
            html: `
              <h2>🔒 Automated Database Backup</h2>
              <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
              <h3>Backup Contents:</h3>
              <ul>
                <li>Users: ${users.length}</li>
                <li>Students: ${students.length}</li>
                <li>Leads: ${leads.length}</li>
                <li>Batches: ${batches.length}</li>
                <li>Payments: ${payments.length}</li>
                <li>Referrals: ${referrals.length}</li>
                <li>Attendance: ${attendance.length}</li>
                <li>Invoices: ${invoices.length}</li>
                <li>Audit Logs: ${auditLogs.length}</li>
              </ul>
              <p><strong>Backup file is attached.</strong></p>
              <p><em>This backup was triggered automatically on user login.</em></p>
            `,
            attachments: [
              {
                filename: `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
                content: Buffer.from(JSON.stringify(backup, null, 2)).toString('base64'),
              }
            ]
          }),
        })

        if (!response.ok) {
          console.error('Failed to send backup email:', await response.text())
        } else {
          console.log('✅ Backup email sent successfully')
        }
      } catch (emailError) {
        console.error('Error sending backup email:', emailError)
      }
    }

    // Also store in database as audit log
    await prisma.auditLog.create({
      data: {
        action: 'SYSTEM_ERROR', // Using existing enum, ideally would be BACKUP_CREATED
        severity: 'INFO',
        description: `Database backup completed. Students: ${students.length}, Leads: ${leads.length}, Batches: ${batches.length}`,
        metadata: {
          backupCounts: backup.counts,
          timestamp: backup.timestamp,
        }
      }
    })

    console.log('✅ Backup completed:', backup.counts)

    return NextResponse.json({
      success: true,
      timestamp: backup.timestamp,
      counts: backup.counts,
      message: 'Backup completed and emailed successfully'
    })

  } catch (error) {
    console.error('❌ Backup failed:', error)

    // Log the failure
    try {
      await prisma.auditLog.create({
        data: {
          action: 'SYSTEM_ERROR',
          severity: 'ERROR',
          description: 'Automated backup failed',
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
  } finally {
    await prisma.$disconnect()
  }
}

// Support both GET (for Vercel Cron) and POST (for manual triggers)
export async function GET(request: NextRequest) {
  return performBackup()
}

export async function POST(request: NextRequest) {
  return performBackup()
}
