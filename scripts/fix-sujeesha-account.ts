import { prisma } from '../lib/prisma'

async function fixSujeeshaAccount() {
  console.log('🔧 Fixing Sujeesha\'s account...\n')

  // Update user to set isActive = true
  const user = await prisma.user.update({
    where: {
      email: 'sujeeshasureshbabu@gmail.com'
    },
    data: {
      active: true
    }
  })

  console.log('✅ Account fixed!')
  console.log(`   Name: ${user.name}`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Role: ${user.role}`)
  console.log(`   Active: ${user.active}`)
  console.log(`   Has Password: ${user.password ? 'Yes' : 'No'}`)

  console.log('\n✅ Sujeesha can now log in with her password.')
  console.log('   If she still has issues, send her a password reset link.')

  await prisma.$disconnect()
}

fixSujeeshaAccount()
  .catch(console.error)
