import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking database...\n')

  const studentCount = await prisma.student.count()
  const leadCount = await prisma.lead.count()
  const batchCount = await prisma.batch.count()
  const userCount = await prisma.user.count()

  console.log(`👥 Users: ${userCount}`)
  console.log(`🎓 Students: ${studentCount}`)
  console.log(`📋 Leads: ${leadCount}`)
  console.log(`📚 Batches: ${batchCount}`)

  if (studentCount > 0) {
    console.log('\n📊 Recent Students:')
    const students = await prisma.student.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        studentId: true,
        name: true,
        email: true,
        createdAt: true,
      }
    })
    students.forEach(s => {
      console.log(`  - ${s.studentId}: ${s.name} (${s.email})`)
    })
  }

  if (leadCount > 0) {
    console.log('\n📋 Recent Leads:')
    const leads = await prisma.lead.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        name: true,
        whatsapp: true,
        source: true,
        createdAt: true,
      }
    })
    leads.forEach(l => {
      console.log(`  - ${l.name} (${l.whatsapp}) - ${l.source}`)
    })
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
