import { prisma } from '../lib/prisma'

async function listTeachers() {
  try {
    const teachers = await prisma.user.findMany({
      where: {
        role: 'TEACHER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log('\n📋 Teachers in Database:\n')
    console.log('=' .repeat(80))

    if (teachers.length === 0) {
      console.log('No teachers found in the database.')
    } else {
      teachers.forEach((teacher, index) => {
        const needsSetup = teacher.email.includes('@planbeta.internal')
        console.log(`\n${index + 1}. ${teacher.name}`)
        console.log(`   Email: ${teacher.email}`)
        console.log(`   Status: ${teacher.active ? '✅ Active' : '❌ Inactive'}`)
        console.log(`   Needs Setup: ${needsSetup ? '⚠️  YES (auto-generated email)' : '✅ NO (real email)'}`)

        if (needsSetup) {
          console.log(`   \n   🔐 Test Login Credentials:`)
          console.log(`      Email: ${teacher.email}`)
          console.log(`      Password: temporary123`)
        }
      })
    }

    console.log('\n' + '='.repeat(80))
    console.log('\n💡 To test the account setup flow:')
    console.log('   1. Login with any teacher that has an auto-generated email')
    console.log('   2. Use password: temporary123')
    console.log('   3. You will be redirected to /dashboard/account-setup')
    console.log('   4. Enter a real email and new password\n')
  } catch (error) {
    console.error('Error listing teachers:', error)
  } finally {
    await prisma.$disconnect()
  }
}

listTeachers()
