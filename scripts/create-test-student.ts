import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const testStudent = await prisma.student.upsert({
    where: { studentId: 'teststudent01' },
    update: {},
    create: {
      studentId: 'teststudent01',
      name: 'Test Student',
      whatsapp: '+1234567890',
      email: 'test@student.com',
      currentLevel: 'A1',
      originalPrice: 100,
      finalPrice: 100,
      referralSource: 'INSTAGRAM',
    },
  })

  console.log('✅ Test student created:', testStudent)
  console.log('\nUse this ID to post: teststudent01')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
