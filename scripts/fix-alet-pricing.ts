/**
 * Fix Alet's Pricing Error
 *
 * Alet was incorrectly charged €16,000 instead of €156 for A2 level.
 * This is a 100x error - the INR price (₹16,000) was entered in the EUR field.
 *
 * Correct A2 pricing:
 * - EUR: €156
 * - INR: ₹16,000
 *
 * Usage: npx tsx scripts/fix-alet-pricing.ts
 */

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()
const Decimal = Prisma.Decimal

const CORRECT_A2_PRICE_EUR = 156

async function fixAletPricing() {
  console.log('🔧 Fixing Alet\'s Pricing Error')
  console.log('='.repeat(60))
  console.log('')

  try {
    // Find Alet
    const alet = await prisma.student.findFirst({
      where: { name: 'Alet' },
      include: {
        payments: true
      }
    })

    if (!alet) {
      console.log('❌ Student Alet not found')
      return
    }

    console.log('Current Data:')
    console.log(`  Name: ${alet.name}`)
    console.log(`  Student ID: ${alet.studentId}`)
    console.log(`  Level: ${alet.currentLevel}`)
    console.log(`  Currency: ${alet.currency}`)
    console.log(`  Original Price: €${alet.originalPrice}`)
    console.log(`  Final Price: €${alet.finalPrice}`)
    console.log(`  Total Paid: €${alet.totalPaid}`)
    console.log(`  Balance: €${alet.balance}`)
    console.log(`  Payments: ${alet.payments.length}`)
    console.log('')

    // Confirm the error
    if (Number(alet.finalPrice) !== 16000) {
      console.log('⚠️  Price is not €16,000. Aborting fix.')
      console.log(`   Current price: €${alet.finalPrice}`)
      return
    }

    console.log('Error Confirmed:')
    console.log(`  ❌ Current Price: €16,000`)
    console.log(`  ✅ Correct Price: €${CORRECT_A2_PRICE_EUR}`)
    console.log(`  💰 Overcharge: €${16000 - CORRECT_A2_PRICE_EUR}`)
    console.log('')

    // Update in transaction
    await prisma.$transaction(async (tx) => {
      // Update student record
      await tx.student.update({
        where: { id: alet.id },
        data: {
          originalPrice: new Decimal(CORRECT_A2_PRICE_EUR),
          finalPrice: new Decimal(CORRECT_A2_PRICE_EUR),
          totalPaid: new Decimal(CORRECT_A2_PRICE_EUR),
          totalPaidEur: new Decimal(CORRECT_A2_PRICE_EUR),
          balance: new Decimal(0),
          eurEquivalent: new Decimal(CORRECT_A2_PRICE_EUR),
        }
      })

      console.log('✅ Updated student record')

      // Update payment records
      for (const payment of alet.payments) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            amount: new Decimal(CORRECT_A2_PRICE_EUR),
          }
        })
        console.log(`✅ Updated payment ${payment.id}: €16,000 → €${CORRECT_A2_PRICE_EUR}`)
      }
    })

    console.log('')
    console.log('🎉 Fix Complete!')
    console.log('')

    // Verify
    const updatedAlet = await prisma.student.findUnique({
      where: { id: alet.id },
      include: { payments: true }
    })

    console.log('Verified New Data:')
    console.log(`  Final Price: €${updatedAlet?.finalPrice}`)
    console.log(`  Total Paid: €${updatedAlet?.totalPaid}`)
    console.log(`  Balance: €${updatedAlet?.balance}`)
    console.log(`  Payment Amount: €${updatedAlet?.payments[0]?.amount}`)
    console.log('')

    console.log('📊 Impact on Revenue:')
    console.log(`  Old Total Revenue: ~€21,388.67`)
    console.log(`  Adjustment: -€15,844.00`)
    console.log(`  New Total Revenue: ~€5,544.67`)
    console.log('')

  } catch (error) {
    console.error('❌ Error fixing pricing:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixAletPricing()
  .then(() => {
    console.log('✅ All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Fix failed:', error)
    process.exit(1)
  })
