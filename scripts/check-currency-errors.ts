import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Checking for potential currency errors...\n')

  // Find unusually high EUR payments (normal range is 40-220)
  const highEurPayments = await prisma.payment.findMany({
    where: {
      currency: 'EUR',
      amount: { gt: 500 },
      status: 'COMPLETED',
    },
    include: {
      student: {
        select: {
          name: true,
          studentId: true,
        },
      },
    },
    orderBy: {
      amount: 'desc',
    },
  })

  // Find unusually low INR payments (normal range is 10000-22000)
  const lowInrPayments = await prisma.payment.findMany({
    where: {
      currency: 'INR',
      amount: { lt: 5000 },
      status: 'COMPLETED',
    },
    include: {
      student: {
        select: {
          name: true,
          studentId: true,
        },
      },
    },
    orderBy: {
      amount: 'asc',
    },
  })

  console.log('=== SUSPICIOUSLY HIGH EUR PAYMENTS (>€500) ===')
  if (highEurPayments.length === 0) {
    console.log('✅ None found - all EUR payments look normal\n')
  } else {
    highEurPayments.forEach((p) => {
      console.log(`⚠️  ${p.student.name} (${p.student.studentId})`)
      console.log(`   Amount: EUR ${p.amount}`)
      console.log(`   Date: ${p.paymentDate.toISOString().split('T')[0]}`)
      console.log(`   Method: ${p.method}`)
      console.log(`   ID: ${p.id}`)
      console.log()
    })
  }

  console.log('=== SUSPICIOUSLY LOW INR PAYMENTS (<₹5000) ===')
  if (lowInrPayments.length === 0) {
    console.log('✅ None found - all INR payments look normal\n')
  } else {
    lowInrPayments.forEach((p) => {
      console.log(`⚠️  ${p.student.name} (${p.student.studentId})`)
      console.log(`   Amount: INR ${p.amount}`)
      console.log(`   Date: ${p.paymentDate.toISOString().split('T')[0]}`)
      console.log(`   Method: ${p.method}`)
      console.log(`   ID: ${p.id}`)
      console.log()
    })
  }

  // Summary statistics
  const allPayments = await prisma.payment.findMany({
    where: { status: 'COMPLETED' },
  })

  const eurPayments = allPayments.filter((p) => p.currency === 'EUR')
  const inrPayments = allPayments.filter((p) => p.currency === 'INR')

  console.log('=== PAYMENT STATISTICS ===')
  console.log(`Total payments: ${allPayments.length}`)
  console.log()
  console.log('EUR Payments:')
  console.log(`  Count: ${eurPayments.length}`)
  console.log(`  Min: €${Math.min(...eurPayments.map((p) => Number(p.amount)))}`)
  console.log(`  Max: €${Math.max(...eurPayments.map((p) => Number(p.amount)))}`)
  console.log(
    `  Average: €${(eurPayments.reduce((sum, p) => sum + Number(p.amount), 0) / eurPayments.length).toFixed(2)}`
  )
  console.log()
  console.log('INR Payments:')
  console.log(`  Count: ${inrPayments.length}`)
  console.log(`  Min: ₹${Math.min(...inrPayments.map((p) => Number(p.amount)))}`)
  console.log(`  Max: ₹${Math.max(...inrPayments.map((p) => Number(p.amount)))}`)
  console.log(
    `  Average: ₹${(inrPayments.reduce((sum, p) => sum + Number(p.amount), 0) / inrPayments.length).toFixed(2)}`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
