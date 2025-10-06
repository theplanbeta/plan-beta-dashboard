import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateMarketingUser() {
  console.log('🔄 Updating marketing user name...\n')

  try {
    const user = await prisma.user.update({
      where: { email: 'marketing@planbeta.in' },
      data: {
        name: 'Sree - Red Collage',
      },
    })

    console.log('✅ Marketing user updated successfully!')
    console.log(`   Email: ${user.email}`)
    console.log(`   Name: ${user.name}`)
    console.log(`   Role: ${user.role}\n`)
  } catch (error) {
    console.error('❌ Error updating user:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

updateMarketingUser()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
