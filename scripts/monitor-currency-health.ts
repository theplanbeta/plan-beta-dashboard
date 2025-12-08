import { PrismaClient } from '@prisma/client'
import { detectCurrencyErrors, formatValidationResult } from '@/lib/currency-validator'

const prisma = new PrismaClient()

/**
 * Proactive Currency Health Monitor
 *
 * Run this script periodically (e.g., daily via cron) to detect
 * currency errors in recent payments.
 */
async function main() {
  console.log('🔍 Currency Health Monitor')
  console.log('=' .repeat(60))
  console.log()

  // Check payments from last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentPayments = await prisma.payment.findMany({
    where: {
      status: 'COMPLETED',
      createdAt: {
        gte: thirtyDaysAgo,
      },
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
      createdAt: 'desc',
    },
  })

  console.log(`Analyzing ${recentPayments.length} payments from the last 30 days...\n`)

  // Detect currency errors
  const suspiciousPayments = detectCurrencyErrors(
    recentPayments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency as 'EUR' | 'INR',
      studentName: p.student.name,
    }))
  )

  if (suspiciousPayments.length === 0) {
    console.log('✅ All payments look good! No currency errors detected.')
    console.log()
    return
  }

  console.log(`⚠️  Found ${suspiciousPayments.length} suspicious payment(s):\n`)

  suspiciousPayments.forEach(({ payment, validation }, index) => {
    const fullPayment = recentPayments.find((p) => p.id === payment.id)
    if (!fullPayment) return

    console.log(`${index + 1}. ${payment.studentName} (${fullPayment.student.studentId})`)
    console.log(`   Payment ID: ${payment.id}`)
    console.log(`   Amount: ${payment.currency} ${payment.amount}`)
    console.log(`   Date: ${fullPayment.paymentDate.toISOString().split('T')[0]}`)
    console.log(`   Status: ${fullPayment.status}`)
    console.log()
    console.log(formatValidationResult(validation).split('\n').map(line => '   ' + line).join('\n'))
    console.log()
    console.log('-'.repeat(60))
    console.log()
  })

  // Summary and recommendations
  console.log('📊 Summary:')
  console.log(`   Total recent payments: ${recentPayments.length}`)
  console.log(`   Suspicious payments: ${suspiciousPayments.length}`)
  console.log(
    `   Health score: ${(((recentPayments.length - suspiciousPayments.length) / recentPayments.length) * 100).toFixed(1)}%`
  )
  console.log()

  console.log('💡 Recommendations:')
  console.log('   1. Review suspicious payments above')
  console.log('   2. Fix currency errors using fix scripts in /scripts')
  console.log('   3. Payment API now validates currencies automatically')
  console.log('   4. Schedule this script to run daily via cron')
  console.log()

  // Exit with error code if issues found (useful for CI/alerts)
  if (suspiciousPayments.length > 0) {
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error('❌ Error running currency health check:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
