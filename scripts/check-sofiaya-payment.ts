import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Investigating Sofiaya Biju payment...\n')

  // Find Sofiaya's student record and all payments
  const student = await prisma.student.findFirst({
    where: {
      name: {
        contains: 'Sofiaya',
        mode: 'insensitive',
      },
    },
    include: {
      payments: {
        orderBy: {
          paymentDate: 'asc',
        },
      },
      batch: true,
    },
  })

  if (!student) {
    console.log('❌ Student not found!')
    return
  }

  console.log('Student Information:')
  console.log(`  Name: ${student.name}`)
  console.log(`  Student ID: ${student.studentId}`)
  console.log(`  Level: ${student.currentLevel}`)
  console.log(`  Status: ${student.completionStatus}`)
  console.log(`  Currency: ${student.currency}`)
  console.log(`  Original Price: ${student.currency === 'EUR' ? '€' : '₹'}${student.originalPrice}`)
  console.log(`  Final Price: ${student.currency === 'EUR' ? '€' : '₹'}${student.finalPrice}`)
  console.log(`  Total Paid: ${student.currency === 'EUR' ? '€' : '₹'}${student.totalPaid}`)
  console.log(`  Balance: ${student.currency === 'EUR' ? '€' : '₹'}${student.balance}`)
  console.log(`  Batch: ${student.batch?.batchCode || 'N/A'}`)
  console.log()

  console.log('Payment History:')
  if (student.payments.length === 0) {
    console.log('  No payments found')
  } else {
    student.payments.forEach((payment, index) => {
      console.log(`\n  Payment ${index + 1}:`)
      console.log(`    ID: ${payment.id}`)
      console.log(`    Amount: ${payment.currency} ${payment.amount}`)
      console.log(`    Date: ${payment.paymentDate.toISOString().split('T')[0]}`)
      console.log(`    Method: ${payment.method}`)
      console.log(`    Status: ${payment.status}`)
    })
  }

  console.log('\n=== ANALYSIS ===')

  // Check if INR 90 makes sense
  const suspiciousPayment = student.payments.find(p =>
    p.currency === 'INR' && Number(p.amount) === 90
  )

  if (suspiciousPayment) {
    console.log('⚠️  Found suspicious INR 90 payment')
    console.log()
    console.log('This payment is likely INCORRECT because:')
    console.log('1. Student currency is: ' + student.currency)
    console.log('2. Normal EUR course prices range: €32 - €220')
    console.log('3. Normal INR course prices range: ₹10,000 - ₹22,000')
    console.log('4. INR 90 = €0.86 (absurdly low)')
    console.log('5. EUR 90 would make sense for a hybrid/discounted course')
    console.log()

    if (student.currency === 'EUR') {
      console.log('✅ RECOMMENDATION: Change INR 90 to EUR 90')
      console.log(`   Current: INR 90 = €${(90 / 104.5).toFixed(2)}`)
      console.log('   Should be: EUR 90')
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
