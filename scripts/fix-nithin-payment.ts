import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Finding nithin mathew payment with wrong currency...\n')

  // Find the payment
  const payment = await prisma.payment.findFirst({
    where: {
      student: {
        name: {
          contains: 'nithin',
          mode: 'insensitive',
        },
      },
      amount: 6000,
      currency: 'EUR',
    },
    include: {
      student: {
        select: {
          name: true,
          studentId: true,
        },
      },
    },
  })

  if (!payment) {
    console.log('❌ Payment not found!')
    return
  }

  console.log('Found payment:')
  console.log(`  ID: ${payment.id}`)
  console.log(`  Student: ${payment.student.name} (${payment.student.studentId})`)
  console.log(`  Amount: ${payment.amount}`)
  console.log(`  Currency: ${payment.currency} ❌ (WRONG)`)
  console.log(`  Payment Date: ${payment.paymentDate.toISOString().split('T')[0]}`)
  console.log(`  Method: ${payment.method}`)
  console.log()

  console.log('Fixing currency from EUR to INR...')

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { currency: 'INR' },
  })

  console.log('✅ Payment fixed!')
  console.log(`  New currency: ${updated.currency}`)
  console.log()
  console.log('Impact:')
  console.log(`  Before: EUR 6000 counted as €6000`)
  console.log(`  After:  INR 6000 counted as ₹6000 = €57.42`)
  console.log(`  Difference: €5942.58 removed from November revenue`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
