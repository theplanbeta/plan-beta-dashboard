import { prisma } from '../lib/prisma'

async function checkSujeeshaAccount() {
  console.log('🔍 Investigating Sujeesha\'s account...\n')

  // Find user
  const user = await prisma.user.findFirst({
    where: {
      name: { contains: 'Sujeesha', mode: 'insensitive' }
    }
  })

  if (!user) {
    console.log('❌ User not found with name containing "Sujeesha"')

    // Try to find all teachers
    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' }
    })

    console.log('\n📋 All teachers in system:')
    teachers.forEach(t => {
      console.log(`  - ${t.name} (${t.email})`)
    })

    await prisma.$disconnect()
    return
  }

  console.log('✅ User found:')
  console.log(`   Name: ${user.name}`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Role: ${user.role}`)
  console.log(`   Active: ${user.isActive}`)
  console.log(`   Has Password: ${user.password ? 'Yes' : 'No'}`)
  console.log(`   Created: ${user.createdAt}`)
  console.log(`   Last Updated: ${user.updatedAt}`)

  // Check recent audit logs
  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { userId: user.id },
        { details: { contains: user.email } }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 15
  })

  console.log(`\n📊 Recent activity (${logs.length} entries):`)
  logs.forEach(log => {
    console.log(`   ${log.createdAt.toISOString().replace('T', ' ').slice(0, 19)} - ${log.action}`)
    if (log.details) {
      console.log(`      ${log.details.substring(0, 100)}`)
    }
  })

  await prisma.$disconnect()
}

checkSujeeshaAccount()
  .catch(console.error)
