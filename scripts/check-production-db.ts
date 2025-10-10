import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking PRODUCTION database...\n')

  try {
    const studentCount = await prisma.student.count()
    const leadCount = await prisma.lead.count()
    const batchCount = await prisma.batch.count()
    const userCount = await prisma.user.count()

    console.log(`👥 Users: ${userCount}`)
    console.log(`🎓 Students: ${studentCount}`)
    console.log(`📋 Leads: ${leadCount}`)
    console.log(`📚 Batches: ${batchCount}`)

    if (studentCount > 0) {
      console.log('\n📊 All Students:')
      const students = await prisma.student.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          studentId: true,
          name: true,
          email: true,
          whatsapp: true,
          currentLevel: true,
          isCombo: true,
          comboLevels: true,
          originalPrice: true,
          finalPrice: true,
          currency: true,
          paymentStatus: true,
          referralSource: true,
          createdAt: true,
        }
      })
      console.log(JSON.stringify(students, null, 2))
    }

    if (leadCount > 0) {
      console.log('\n📋 All Leads:')
      const leads = await prisma.lead.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          whatsapp: true,
          email: true,
          phone: true,
          source: true,
          status: true,
          quality: true,
          interestedLevel: true,
          interestedCombo: true,
          interestedLevels: true,
          converted: true,
          createdAt: true,
        }
      })
      console.log(JSON.stringify(leads, null, 2))
    }

    if (batchCount > 0) {
      console.log('\n📚 All Batches:')
      const batches = await prisma.batch.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          batchCode: true,
          level: true,
          startDate: true,
          endDate: true,
          schedule: true,
          totalSeats: true,
          enrolledCount: true,
          status: true,
          createdAt: true,
        }
      })
      console.log(JSON.stringify(batches, null, 2))
    }

    if (studentCount === 0 && leadCount === 0 && batchCount === 0) {
      console.log('\n⚠️  Production database is also empty!')
    } else {
      console.log('\n✅ Production database has data! Exporting to file...')
      const data = {
        students: await prisma.student.findMany(),
        leads: await prisma.lead.findMany(),
        batches: await prisma.batch.findMany(),
      }

      const fs = require('fs')
      fs.writeFileSync(
        'production-backup.json',
        JSON.stringify(data, null, 2)
      )
      console.log('💾 Data exported to production-backup.json')
    }
  } catch (error) {
    console.error('❌ Error checking production database:', error)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
