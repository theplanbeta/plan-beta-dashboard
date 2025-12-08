import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Analyzing payment income for November and December 2024...\n')

  // Get all payments for November 2024
  const novemberStart = new Date('2024-11-01')
  const novemberEnd = new Date('2024-11-30T23:59:59')

  const novemberPayments = await prisma.payment.findMany({
    where: {
      paymentDate: {
        gte: novemberStart,
        lte: novemberEnd,
      },
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
      paymentDate: 'asc',
    },
  })

  console.log('=== NOVEMBER 2024 ===')
  console.log(`Total payments: ${novemberPayments.length}\n`)

  let novInr = 0
  let novEur = 0

  console.log('Payment Details:')
  novemberPayments.forEach((payment) => {
    console.log(
      `${payment.paymentDate.toISOString().split('T')[0]} | ${payment.student.name} (${payment.student.studentId}) | ${payment.currency} ${payment.amount}`
    )
    if (payment.currency === 'INR') {
      novInr += payment.amount
    } else if (payment.currency === 'EUR') {
      novEur += payment.amount
    }
  })

  console.log('\nNovember Totals:')
  console.log(`INR: ₹${novInr.toFixed(2)}`)
  console.log(`EUR: €${novEur.toFixed(2)}`)
  console.log(`INCORRECT SUM (if added together): ${(novInr + novEur).toFixed(2)}`)
  console.log()

  // Get all payments for December 2024
  const decemberStart = new Date('2024-12-01')
  const decemberEnd = new Date('2024-12-31T23:59:59')

  const decemberPayments = await prisma.payment.findMany({
    where: {
      paymentDate: {
        gte: decemberStart,
        lte: decemberEnd,
      },
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
      paymentDate: 'asc',
    },
  })

  console.log('\n=== DECEMBER 2024 ===')
  console.log(`Total payments: ${decemberPayments.length}\n`)

  let decInr = 0
  let decEur = 0

  console.log('Payment Details:')
  decemberPayments.forEach((payment) => {
    console.log(
      `${payment.paymentDate.toISOString().split('T')[0]} | ${payment.student.name} (${payment.student.studentId}) | ${payment.currency} ${payment.amount}`
    )
    if (payment.currency === 'INR') {
      decInr += payment.amount
    } else if (payment.currency === 'EUR') {
      decEur += payment.amount
    }
  })

  console.log('\nDecember Totals:')
  console.log(`INR: ₹${decInr.toFixed(2)}`)
  console.log(`EUR: €${decEur.toFixed(2)}`)
  console.log(`INCORRECT SUM (if added together): ${(decInr + decEur).toFixed(2)}`)
  console.log()

  console.log('\n=== ANALYSIS ===')
  console.log('If the dashboard is showing inflated numbers, it means:')
  console.log('1. INR and EUR amounts are being added together without conversion')
  console.log('2. For example: ₹10,000 + €100 = 10,100 (WRONG!)')
  console.log('3. Should be: ₹10,000 + (€100 × 89) = ₹18,900 (CORRECT)')
  console.log()
  console.log('OR it could be:')
  console.log('4. Duplicate payments being counted')
  console.log('5. Wrong date filtering in the dashboard code')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
