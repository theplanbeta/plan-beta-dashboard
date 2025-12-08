import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Checking all payments in the database...\n')

  const allPayments = await prisma.payment.findMany({
    where: {
      status: 'COMPLETED',
    },
    select: {
      id: true,
      amount: true,
      currency: true,
      paymentDate: true,
      student: {
        select: {
          name: true,
          studentId: true,
        },
      },
    },
    orderBy: {
      paymentDate: 'desc',
    },
    take: 100,
  })

  console.log(`Total completed payments: ${allPayments.length}\n`)

  // Group by month
  const byMonth: Record<string, { inr: number; eur: number; count: number }> = {}

  allPayments.forEach((payment) => {
    const monthKey = payment.paymentDate.toISOString().substring(0, 7) // YYYY-MM

    if (!byMonth[monthKey]) {
      byMonth[monthKey] = { inr: 0, eur: 0, count: 0 }
    }

    byMonth[monthKey].count++

    if (payment.currency === 'INR') {
      byMonth[monthKey].inr += Number(payment.amount)
    } else if (payment.currency === 'EUR') {
      byMonth[monthKey].eur += Number(payment.amount)
    }
  })

  console.log('=== PAYMENTS BY MONTH ===')
  Object.keys(byMonth)
    .sort()
    .reverse()
    .forEach((month) => {
      const data = byMonth[month]
      console.log(`\n${month}: ${data.count} payments`)
      console.log(`  INR: ₹${data.inr.toFixed(2)}`)
      console.log(`  EUR: €${data.eur.toFixed(2)}`)
      console.log(`  WRONG if added: ${(data.inr + data.eur).toFixed(2)}`)
      console.log(`  CORRECT in INR (EUR×89): ₹${(data.inr + data.eur * 89).toFixed(2)}`)
    })

  console.log('\n\n=== RECENT 20 PAYMENTS ===')
  allPayments.slice(0, 20).forEach((payment) => {
    console.log(
      `${payment.paymentDate.toISOString().split('T')[0]} | ${payment.student.name.padEnd(20)} | ${payment.currency} ${payment.amount.toFixed(2)}`
    )
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
