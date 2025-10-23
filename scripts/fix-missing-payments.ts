/**
 * SAFE Payment Record Fixer
 * Creates missing payment transaction records for students with totalPaid > 0
 *
 * SAFETY FEATURES:
 * - Dry-run mode by default (use --execute flag to actually make changes)
 * - Transaction-based (all changes or none)
 * - Creates detailed log file
 * - Validates data integrity before and after
 */

import { prisma } from '../lib/prisma'
import * as fs from 'fs'
import * as path from 'path'

const DRY_RUN = !process.argv.includes('--execute')
const LOG_DIR = path.join(process.cwd(), 'logs')
const LOG_FILE = path.join(LOG_DIR, `payment-fix-${new Date().toISOString().slice(0, 10)}.log`)

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

function log(message: string) {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${message}`
  console.log(logMessage)
  fs.appendFileSync(LOG_FILE, logMessage + '\n')
}

async function fixMissingPayments() {
  log('=' .repeat(80))
  log(`🔧 Payment Record Fixer Started`)
  log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '⚡ EXECUTE MODE (changes WILL be made)'}`)
  log('=' .repeat(80))
  log('')

  if (DRY_RUN) {
    log('⚠️  Running in DRY-RUN mode. No changes will be made to the database.')
    log('⚠️  Review the output, then run with --execute flag to apply changes.')
    log('')
  } else {
    log('🚨 EXECUTE MODE - Changes will be made to the database!')
    log('')
  }

  try {
    // Find problematic students
    const studentsWithMissingPayments = await prisma.student.findMany({
      where: {
        totalPaid: {
          gt: 0
        }
      },
      include: {
        payments: true,
        batch: {
          select: {
            batchCode: true,
          }
        }
      },
      orderBy: {
        enrollmentDate: 'desc'
      }
    })

    log(`📊 Found ${studentsWithMissingPayments.length} students with totalPaid > 0`)
    log('')

    // Filter to only students with missing records
    const studentsNeedingFix = studentsWithMissingPayments.filter(student => {
      const totalPaid = Number(student.totalPaid)
      const paymentsSum = student.payments.reduce((sum, p) => sum + Number(p.amount), 0)
      return totalPaid !== paymentsSum
    })

    log(`⚠️  ${studentsNeedingFix.length} students need payment records created`)
    log('')

    if (studentsNeedingFix.length === 0) {
      log('✅ No students need fixing. All payment records are correct!')
      return
    }

    // Log details
    log('📋 STUDENTS TO BE FIXED:')
    log('-'.repeat(80))

    const paymentRecordsToCreate: Array<{
      studentId: string
      studentName: string
      amount: number
      currency: string
      paymentDate: Date
    }> = []

    for (const student of studentsNeedingFix) {
      const totalPaid = Number(student.totalPaid)
      const paymentsSum = student.payments.reduce((sum, p) => sum + Number(p.amount), 0)
      const discrepancy = totalPaid - paymentsSum

      log(`
Student: ${student.name} (${student.studentId})
  Batch: ${student.batch?.batchCode || 'No batch'}
  Enrolled: ${student.enrollmentDate.toISOString().split('T')[0]}
  Currency: ${student.currency}
  Total Paid in record: ${student.currency} ${totalPaid.toFixed(2)}
  Sum of payment transactions: ${student.currency} ${paymentsSum.toFixed(2)}
  Discrepancy: ${student.currency} ${discrepancy.toFixed(2)}
  Action: Create payment record for ${student.currency} ${discrepancy.toFixed(2)}
`)

      paymentRecordsToCreate.push({
        studentId: student.id,
        studentName: student.name,
        amount: discrepancy,
        currency: student.currency,
        paymentDate: student.enrollmentDate
      })
    }

    log('-'.repeat(80))
    log('')
    log(`📝 SUMMARY:`)
    log(`  - Total students to fix: ${studentsNeedingFix.length}`)
    log(`  - Total payment records to create: ${paymentRecordsToCreate.length}`)
    log('')

    // Execute the fix if not in dry-run mode
    if (!DRY_RUN) {
      log('🔄 Starting transaction to create payment records...')
      log('')

      await prisma.$transaction(async (tx) => {
        let created = 0

        for (const record of paymentRecordsToCreate) {
          const payment = await tx.payment.create({
            data: {
              studentId: record.studentId,
              amount: record.amount,
              currency: record.currency,
              paymentDate: record.paymentDate,
              method: 'OTHER', // Default method - can be edited later
              status: 'COMPLETED',
              notes: 'Initial payment - retroactively added to fix data integrity',
            }
          })

          created++
          log(`  ✅ Created payment record for ${record.studentName} (${record.currency} ${record.amount.toFixed(2)})`)
        }

        log('')
        log(`✅ Transaction complete! Created ${created} payment records.`)
      })

      // Verify the fix
      log('')
      log('🔍 Verifying the fix...')
      log('')

      const verifyStudents = await prisma.student.findMany({
        where: {
          id: {
            in: paymentRecordsToCreate.map(r => r.studentId)
          }
        },
        include: {
          payments: true
        }
      })

      let allCorrect = true
      for (const student of verifyStudents) {
        const totalPaid = Number(student.totalPaid)
        const paymentsSum = student.payments.reduce((sum, p) => sum + Number(p.amount), 0)

        if (Math.abs(totalPaid - paymentsSum) < 0.01) { // Allow for tiny floating point differences
          log(`  ✅ ${student.name}: Verified (${student.currency} ${totalPaid.toFixed(2)} = ${paymentsSum.toFixed(2)})`)
        } else {
          log(`  ❌ ${student.name}: MISMATCH (${student.currency} ${totalPaid.toFixed(2)} ≠ ${paymentsSum.toFixed(2)})`)
          allCorrect = false
        }
      }

      log('')
      if (allCorrect) {
        log('🎉 SUCCESS! All payment records have been created and verified.')
      } else {
        log('⚠️  WARNING: Some records may not have been created correctly. Please review.')
      }
    } else {
      log('ℹ️  DRY-RUN complete. No changes were made.')
      log('')
      log('To apply these changes, run:')
      log('  npx tsx scripts/fix-missing-payments.ts --execute')
    }

    log('')
    log('=' .repeat(80))
    log(`Log saved to: ${LOG_FILE}`)
    log('=' .repeat(80))

  } catch (error) {
    log('')
    log('❌ ERROR during execution:')
    log(String(error))
    log('')

    if (!DRY_RUN) {
      log('⚠️  Transaction was rolled back. No changes were made to the database.')
    }

    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
fixMissingPayments()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
