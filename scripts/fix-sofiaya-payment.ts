import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Fixing Sofiaya Biju currency error...\n')

  // Find the student
  const student = await prisma.student.findFirst({
    where: {
      name: {
        contains: 'Sofiaya',
        mode: 'insensitive',
      },
    },
    include: {
      payments: true,
    },
  })

  if (!student) {
    console.log('❌ Student not found!')
    return
  }

  console.log('Current state:')
  console.log(`  Student: ${student.name} (${student.studentId})`)
  console.log(`  Currency: ${student.currency} ❌`)
  console.log(`  Original Price: ${student.originalPrice}`)
  console.log(`  Final Price: ${student.finalPrice}`)
  console.log(`  Total Paid: ${student.totalPaid}`)
  console.log(`  Payment Currency: ${student.payments[0]?.currency}`)
  console.log(`  Payment Amount: ${student.payments[0]?.amount}`)
  console.log()

  // Update student record
  const updatedStudent = await prisma.student.update({
    where: { id: student.id },
    data: {
      currency: 'EUR',
    },
  })

  console.log('✅ Student currency updated to EUR')

  // Update payment
  if (student.payments.length > 0) {
    const payment = student.payments[0]
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        currency: 'EUR',
      },
    })
    console.log('✅ Payment currency updated to EUR')
  }

  console.log()
  console.log('New state:')
  console.log(`  Currency: EUR ✅`)
  console.log(`  Original Price: €90`)
  console.log(`  Final Price: €90`)
  console.log(`  Total Paid: €90`)
  console.log()
  console.log('Impact:')
  console.log(`  Before: INR 90 = €0.86`)
  console.log(`  After:  EUR 90`)
  console.log(`  Difference: +€89.14 added to October revenue`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
