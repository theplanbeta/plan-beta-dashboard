import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(process.cwd(), 'backups')

  // Create backups directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  console.log('📦 Starting database backup...\n')

  try {
    // Fetch all data
    const [users, students, leads, batches, payments, referrals, attendance] = await Promise.all([
      prisma.user.findMany(),
      prisma.student.findMany(),
      prisma.lead.findMany(),
      prisma.batch.findMany(),
      prisma.payment.findMany(),
      prisma.referral.findMany(),
      prisma.attendance.findMany(),
    ])

    const backup = {
      timestamp: new Date().toISOString(),
      counts: {
        users: users.length,
        students: students.length,
        leads: leads.length,
        batches: batches.length,
        payments: payments.length,
        referrals: referrals.length,
        attendance: attendance.length,
      },
      data: {
        users,
        students,
        leads,
        batches,
        payments,
        referrals,
        attendance,
      }
    }

    const filename = `backup-${timestamp}.json`
    const filepath = path.join(backupDir, filename)

    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2))

    console.log('✅ Backup completed successfully!\n')
    console.log('📊 Backed up:')
    console.log(`   Users: ${users.length}`)
    console.log(`   Students: ${students.length}`)
    console.log(`   Leads: ${leads.length}`)
    console.log(`   Batches: ${batches.length}`)
    console.log(`   Payments: ${payments.length}`)
    console.log(`   Referrals: ${referrals.length}`)
    console.log(`   Attendance: ${attendance.length}\n`)
    console.log(`💾 Saved to: ${filepath}`)

  } catch (error) {
    console.error('❌ Backup failed:', error)
    throw error
  }
}

backupDatabase()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
