/**
 * READ-ONLY Analysis Script
 * Identifies students with totalPaid > 0 but no payment records
 * Does NOT make any changes to the database
 */

import { prisma } from '../lib/prisma'

async function analyzeData() {
  console.log('🔍 Analyzing database for payment record discrepancies...\n')
  console.log('=' .repeat(80))

  try {
    // Get all students with totalPaid > 0
    const studentsWithPayments = await prisma.student.findMany({
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

    console.log(`\n📊 Total students with totalPaid > 0: ${studentsWithPayments.length}\n`)

    // Analyze each student
    const problematicStudents: any[] = []
    const okStudents: any[] = []

    for (const student of studentsWithPayments) {
      const totalPaid = Number(student.totalPaid)
      const paymentsSum = student.payments.reduce((sum, p) => sum + Number(p.amount), 0)
      const paymentCount = student.payments.length

      const analysis = {
        studentId: student.studentId,
        name: student.name,
        enrollmentDate: student.enrollmentDate.toISOString().split('T')[0],
        batch: student.batch?.batchCode || 'No batch',
        currency: student.currency,
        totalPaid,
        paymentsSum,
        paymentCount,
        discrepancy: totalPaid - paymentsSum,
        status: totalPaid === paymentsSum ? 'OK' : 'MISMATCH'
      }

      if (analysis.status === 'MISMATCH') {
        problematicStudents.push(analysis)
      } else {
        okStudents.push(analysis)
      }
    }

    // Report findings
    console.log('=' .repeat(80))
    console.log(`\n✅ Students with CORRECT payment records: ${okStudents.length}`)
    console.log(`⚠️  Students with MISSING/MISMATCHED payment records: ${problematicStudents.length}\n`)
    console.log('=' .repeat(80))

    if (problematicStudents.length > 0) {
      console.log('\n⚠️  PROBLEMATIC STUDENTS (Need Attention):\n')
      console.log('-'.repeat(80))

      for (const student of problematicStudents) {
        console.log(`
Student ID:       ${student.studentId}
Name:             ${student.name}
Enrolled:         ${student.enrollmentDate}
Batch:            ${student.batch}
Currency:         ${student.currency}
Total Paid:       ${student.currency} ${student.totalPaid.toFixed(2)}
Payments Sum:     ${student.currency} ${student.paymentsSum.toFixed(2)}
Payment Records:  ${student.paymentCount}
Discrepancy:      ${student.currency} ${student.discrepancy.toFixed(2)}
${'-'.repeat(80)}`)
      }
    }

    if (okStudents.length > 0) {
      console.log('\n\n✅ STUDENTS WITH CORRECT RECORDS (Sample of first 5):\n')
      console.log('-'.repeat(80))

      for (const student of okStudents.slice(0, 5)) {
        console.log(`
Student ID:       ${student.studentId}
Name:             ${student.name}
Currency:         ${student.currency}
Total Paid:       ${student.currency} ${student.totalPaid.toFixed(2)}
Payments Sum:     ${student.currency} ${student.paymentsSum.toFixed(2)}
Payment Records:  ${student.paymentCount} ✓
${'-'.repeat(80)}`)
      }

      if (okStudents.length > 5) {
        console.log(`\n... and ${okStudents.length - 5} more students with correct records\n`)
      }
    }

    // Summary statistics
    console.log('\n' + '='.repeat(80))
    console.log('\n📈 SUMMARY STATISTICS:\n')

    const totalDiscrepancy = problematicStudents.reduce((sum, s) => sum + Math.abs(s.discrepancy), 0)
    const eurStudents = problematicStudents.filter(s => s.currency === 'EUR')
    const inrStudents = problematicStudents.filter(s => s.currency === 'INR')

    console.log(`Total amount in discrepancy: ${totalDiscrepancy.toFixed(2)}`)
    console.log(`  - EUR students affected: ${eurStudents.length}`)
    console.log(`  - INR students affected: ${inrStudents.length}`)
    console.log(`\nStudents with 0 payment records: ${problematicStudents.filter(s => s.paymentCount === 0).length}`)
    console.log(`Students with partial records: ${problematicStudents.filter(s => s.paymentCount > 0 && s.discrepancy !== 0).length}`)

    console.log('\n' + '='.repeat(80))
    console.log('\n✅ Analysis complete. NO CHANGES were made to the database.\n')

  } catch (error) {
    console.error('❌ Error during analysis:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run analysis
analyzeData()
