import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const EXCHANGE_RATE = 104.5

async function main() {
  console.log('Fixing nithin mathew (2025-11-777) student record...\n')

  // The payment currency was already fixed to INR previously.
  // But the student record still has currency: EUR with INR pricing (finalPrice: 12000).
  // Need to fix the student currency and recalculate balances.

  const student = await prisma.student.findUnique({
    where: { id: 'cmihgjs38000dkz04z6f24gz4' },
    include: {
      payments: {
        where: { status: 'COMPLETED' },
      },
    },
  })

  if (!student) {
    console.log('❌ Student not found!')
    return
  }

  console.log('Current state:')
  console.log(`  Student: ${student.name} (${student.studentId})`)
  console.log(`  Currency: ${student.currency} ❌ (should be INR)`)
  console.log(`  Final Price: ${student.finalPrice} (this is INR pricing)`)
  console.log(`  Total Paid: ${student.totalPaid}`)
  console.log(`  Balance: ${student.balance}`)
  console.log(`  Payment Status: ${student.paymentStatus}`)
  console.log()
  console.log('Payments:')
  student.payments.forEach((p) => {
    console.log(`  ${p.currency} ${p.amount} (${p.paymentDate.toISOString().split('T')[0]}) - ${p.method}`)
  })
  console.log()

  // Recalculate with correct currency (INR)
  const totalPaid = student.payments.reduce((sum, p) => {
    const amount = Number(p.amount)
    if (p.currency === 'INR') return sum + amount
    // Convert EUR to INR if any
    return sum + amount * EXCHANGE_RATE
  }, 0)

  const totalPaidEur = totalPaid / EXCHANGE_RATE
  const finalPrice = Number(student.finalPrice)
  const eurEquivalent = finalPrice / EXCHANGE_RATE
  const balance = finalPrice - totalPaid

  let paymentStatus: string = 'PENDING'
  if (totalPaid === 0) paymentStatus = 'PENDING'
  else if (totalPaid >= finalPrice) paymentStatus = 'PAID'
  else paymentStatus = 'PARTIAL'

  console.log('Fixing student record...')

  await prisma.student.update({
    where: { id: student.id },
    data: {
      currency: 'INR',
      eurEquivalent,
      exchangeRateUsed: EXCHANGE_RATE,
      totalPaid,
      totalPaidEur,
      balance,
      paymentStatus,
    },
  })

  console.log()
  console.log('✅ Student record fixed!')
  console.log(`  Currency: INR`)
  console.log(`  Final Price: ₹${finalPrice} (€${eurEquivalent.toFixed(2)})`)
  console.log(`  Total Paid: ₹${totalPaid.toFixed(2)} (€${totalPaidEur.toFixed(2)})`)
  console.log(`  Balance: ₹${balance.toFixed(2)}`)
  console.log(`  Payment Status: ${paymentStatus}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
