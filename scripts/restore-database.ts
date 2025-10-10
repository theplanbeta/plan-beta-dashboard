import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function restoreDatabase(backupFile: string) {
  console.log('📥 Starting database restore...\n')

  try {
    const backupPath = path.join(process.cwd(), 'backups', backupFile)

    if (!fs.existsSync(backupPath)) {
      console.error(`❌ Backup file not found: ${backupPath}`)
      process.exit(1)
    }

    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'))

    console.log(`📅 Backup from: ${backup.timestamp}`)
    console.log('📊 Contains:')
    console.log(`   Users: ${backup.counts.users}`)
    console.log(`   Students: ${backup.counts.students}`)
    console.log(`   Leads: ${backup.counts.leads}`)
    console.log(`   Batches: ${backup.counts.batches}`)
    console.log(`   Payments: ${backup.counts.payments}`)
    console.log(`   Referrals: ${backup.counts.referrals}`)
    console.log(`   Attendance: ${backup.counts.attendance}\n`)

    // Restore data (skip users to avoid conflicts with existing accounts)
    if (backup.data.batches?.length > 0) {
      console.log('Restoring batches...')
      for (const batch of backup.data.batches) {
        await prisma.batch.upsert({
          where: { id: batch.id },
          update: batch,
          create: batch,
        })
      }
    }

    if (backup.data.students?.length > 0) {
      console.log('Restoring students...')
      for (const student of backup.data.students) {
        await prisma.student.upsert({
          where: { id: student.id },
          update: student,
          create: student,
        })
      }
    }

    if (backup.data.leads?.length > 0) {
      console.log('Restoring leads...')
      for (const lead of backup.data.leads) {
        await prisma.lead.upsert({
          where: { id: lead.id },
          update: lead,
          create: lead,
        })
      }
    }

    if (backup.data.payments?.length > 0) {
      console.log('Restoring payments...')
      for (const payment of backup.data.payments) {
        await prisma.payment.upsert({
          where: { id: payment.id },
          update: payment,
          create: payment,
        })
      }
    }

    if (backup.data.referrals?.length > 0) {
      console.log('Restoring referrals...')
      for (const referral of backup.data.referrals) {
        await prisma.referral.upsert({
          where: { id: referral.id },
          update: referral,
          create: referral,
        })
      }
    }

    if (backup.data.attendance?.length > 0) {
      console.log('Restoring attendance...')
      for (const record of backup.data.attendance) {
        await prisma.attendance.upsert({
          where: { id: record.id },
          update: record,
          create: record,
        })
      }
    }

    console.log('\n✅ Database restored successfully!')

  } catch (error) {
    console.error('❌ Restore failed:', error)
    throw error
  }
}

const backupFile = process.argv[2]
if (!backupFile) {
  console.error('Usage: npx tsx scripts/restore-database.ts <backup-filename>')
  console.error('Example: npx tsx scripts/restore-database.ts backup-2025-01-15T10-30-00.json')
  process.exit(1)
}

restoreDatabase(backupFile)
  .catch(console.error)
  .finally(() => prisma.$disconnect())
