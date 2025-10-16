import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find Aparna
  const aparna = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { contains: 'aparna', mode: 'insensitive' } },
        { name: { contains: 'aparna', mode: 'insensitive' } }
      ],
      role: 'TEACHER'
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true
    }
  })

  if (!aparna) {
    console.log('❌ No user found with name/email containing "aparna"')
    return
  }

  console.log('\n✅ Found Aparna:')
  console.log(JSON.stringify(aparna, null, 2))

  // Find batches assigned to Aparna
  const batches = await prisma.batch.findMany({
    where: {
      teacherId: aparna.id
    },
    select: {
      id: true,
      batchCode: true,
      level: true,
      status: true,
      teacherId: true
    }
  })

  console.log(`\n📚 Batches assigned to Aparna: ${batches.length}`)
  if (batches.length > 0) {
    console.log(JSON.stringify(batches, null, 2))
  } else {
    console.log('⚠️  No batches assigned to Aparna')
    
    // Show all batches
    const allBatches = await prisma.batch.findMany({
      select: {
        id: true,
        batchCode: true,
        level: true,
        status: true,
        teacherId: true,
        teacher: {
          select: {
            name: true,
            email: true
          }
        }
      },
      take: 10
    })
    
    console.log('\n📋 Sample of all batches (first 10):')
    console.log(JSON.stringify(allBatches, null, 2))
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
