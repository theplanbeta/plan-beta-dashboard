import { prisma } from '../lib/prisma'
import { Prisma } from '@prisma/client'

const Decimal = Prisma.Decimal

/**
 * Backfill payment records for students who were created with initial payments
 * but don't have payment records in the database.
 *
 * This happens when students are enrolled with totalPaid > 0 during creation,
 * but the payment record creation failed or was not implemented at the time.
 */
async function backfillStudentPayments() {
  console.log('🔍 Scanning for students with payments but no payment records...\n')

  // Find all students where totalPaid > 0
  const studentsWithPayments = await prisma.student.findMany({
    where: {
      totalPaid: {
        gt: 0
      }
    },
    include: {
      payments: true,
    },
    orderBy: {
      enrollmentDate: 'desc'
    }
  })

  console.log(`Found ${studentsWithPayments.length} students with totalPaid > 0\n`)

  let backfilledCount = 0
  let skippedCount = 0
  let errorCount = 0

  for (const student of studentsWithPayments) {
    const totalPaid = new Decimal(student.totalPaid.toString())
    const existingPaymentsTotal = student.payments.reduce(
      (sum, payment) => sum.plus(new Decimal(payment.amount.toString())),
      new Decimal(0)
    )

    const missingAmount = totalPaid.minus(existingPaymentsTotal)

    if (missingAmount.greaterThan(0)) {
      console.log(`📝 Student: ${student.name} (${student.studentId})`)
      console.log(`   Total Paid: ${student.currency} ${totalPaid.toString()}`)
      console.log(`   Existing Payments: ${student.currency} ${existingPaymentsTotal.toString()}`)
      console.log(`   Missing Amount: ${student.currency} ${missingAmount.toString()}`)

      try {
        // Create payment record for the missing amount
        const payment = await prisma.payment.create({
          data: {
            studentId: student.id,
            amount: missingAmount,
            currency: student.currency,
            paymentDate: student.enrollmentDate, // Use enrollment date as payment date
            method: 'OTHER',
            status: 'COMPLETED',
            notes: 'Initial payment backfilled by migration script - recorded during student enrollment',
          },
        })

        console.log(`   ✅ Created payment record: ${payment.id}`)
        console.log(`   Payment Date: ${payment.paymentDate.toISOString()}`)
        console.log('')
        backfilledCount++
      } catch (error) {
        console.error(`   ❌ Error creating payment record:`, error)
        console.log('')
        errorCount++
      }
    } else if (missingAmount.lessThan(0)) {
      console.log(`⚠️  Warning: Student ${student.name} (${student.studentId}) has MORE payment records than totalPaid`)
      console.log(`   Total Paid: ${student.currency} ${totalPaid.toString()}`)
      console.log(`   Existing Payments: ${student.currency} ${existingPaymentsTotal.toString()}`)
      console.log(`   This may indicate a data inconsistency that needs manual review`)
      console.log('')
      skippedCount++
    } else {
      // Payment records match totalPaid, skip
      skippedCount++
    }
  }

  console.log('\n📊 Summary:')
  console.log(`   ✅ Payment records backfilled: ${backfilledCount}`)
  console.log(`   ⏭️  Students skipped (already have records): ${skippedCount}`)
  console.log(`   ❌ Errors: ${errorCount}`)
  console.log('\n✨ Backfill complete!')
}

backfillStudentPayments()
  .then(() => {
    console.log('\n👍 Migration completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error)
    process.exit(1)
  })
