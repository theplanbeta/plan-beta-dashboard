import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const aparna = await prisma.user.findFirst({
    where: {
      email: { contains: 'aparna', mode: 'insensitive' },
      role: 'TEACHER'
    },
    select: {
      id: true,
      name: true,
      email: true,
      hourlyRate: true
    }
  })

  if (!aparna) {
    console.log('❌ Aparna not found')
    return
  }

  console.log('\n✅ Aparna:')
  console.log(JSON.stringify(aparna, null, 2))
  console.log(`\nHourly Rate: ${aparna.hourlyRate || 'NOT SET ❌'}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
