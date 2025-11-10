/**
 * Fix EUR Equivalent Data
 *
 * This script fixes corrupted totalPaidEur and eurEquivalent values for all students.
 * The bug occurred when payments were recorded but EUR equivalents weren't recalculated.
 *
 * Usage: npx tsx scripts/fix-eur-equivalents.ts
 */

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()
const Decimal = Prisma.Decimal
const EXCHANGE_RATE = 104.5 // INR to EUR

async function fixEurEquivalents() {
  console.log('🔧 Fixing EUR Equivalent Data')
  console.log('='.repeat(60))
  console.log('')

  try {
    // Get all students
    const students = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        currency: true,
        finalPrice: true,
        totalPaid: true,
        eurEquivalent: true,
        totalPaidEur: true,
        exchangeRateUsed: true,
      }
    })

    console.log(`📊 Found ${students.length} students\n`)

    let eurFixed = 0
    let inrFixed = 0
    let alreadyCorrect = 0

    for (const student of students) {
      const finalPrice = new Decimal(student.finalPrice.toString())
      const totalPaid = new Decimal(student.totalPaid.toString())

      let needsUpdate = false
      const updates: any = {}

      if (student.currency === 'EUR') {
        // For EUR students:
        // - eurEquivalent should equal finalPrice
        // - totalPaidEur should equal totalPaid
        // - exchangeRateUsed should be null

        const currentEurEquivalent = student.eurEquivalent ? new Decimal(student.eurEquivalent.toString()) : null
        const currentTotalPaidEur = student.totalPaidEur ? new Decimal(student.totalPaidEur.toString()) : null

        if (!currentEurEquivalent || !currentEurEquivalent.equals(finalPrice)) {
          updates.eurEquivalent = finalPrice
          needsUpdate = true
        }

        if (!currentTotalPaidEur || !currentTotalPaidEur.equals(totalPaid)) {
          updates.totalPaidEur = totalPaid
          needsUpdate = true
        }

        if (student.exchangeRateUsed !== null) {
          updates.exchangeRateUsed = null
          needsUpdate = true
        }

        if (needsUpdate) {
          await prisma.student.update({
            where: { id: student.id },
            data: updates
          })
          eurFixed++
          console.log(`✅ Fixed EUR student: ${student.name}`)
          console.log(`   totalPaid: €${totalPaid.toString()} → totalPaidEur: €${totalPaid.toString()}`)
        } else {
          alreadyCorrect++
        }

      } else if (student.currency === 'INR') {
        // For INR students:
        // - eurEquivalent should equal finalPrice / EXCHANGE_RATE
        // - totalPaidEur should equal totalPaid / EXCHANGE_RATE
        // - exchangeRateUsed should be EXCHANGE_RATE

        const exchangeRate = new Decimal(EXCHANGE_RATE)
        const correctEurEquivalent = finalPrice.dividedBy(exchangeRate)
        const correctTotalPaidEur = totalPaid.dividedBy(exchangeRate)

        const currentEurEquivalent = student.eurEquivalent ? new Decimal(student.eurEquivalent.toString()) : null
        const currentTotalPaidEur = student.totalPaidEur ? new Decimal(student.totalPaidEur.toString()) : null
        const currentExchangeRate = student.exchangeRateUsed ? new Decimal(student.exchangeRateUsed.toString()) : null

        // Check if values need updating (allow small rounding differences)
        if (!currentEurEquivalent || Math.abs(currentEurEquivalent.minus(correctEurEquivalent).toNumber()) > 0.01) {
          updates.eurEquivalent = correctEurEquivalent
          needsUpdate = true
        }

        if (!currentTotalPaidEur || Math.abs(currentTotalPaidEur.minus(correctTotalPaidEur).toNumber()) > 0.01) {
          updates.totalPaidEur = correctTotalPaidEur
          needsUpdate = true
        }

        if (!currentExchangeRate || !currentExchangeRate.equals(exchangeRate)) {
          updates.exchangeRateUsed = exchangeRate
          needsUpdate = true
        }

        if (needsUpdate) {
          await prisma.student.update({
            where: { id: student.id },
            data: updates
          })
          inrFixed++
          console.log(`✅ Fixed INR student: ${student.name}`)
          console.log(`   totalPaid: ₹${totalPaid.toString()} → totalPaidEur: €${correctTotalPaidEur.toFixed(2)}`)
        } else {
          alreadyCorrect++
        }
      }
    }

    console.log('')
    console.log('='.repeat(60))
    console.log('📊 Summary:')
    console.log(`   EUR students fixed: ${eurFixed}`)
    console.log(`   INR students fixed: ${inrFixed}`)
    console.log(`   Already correct: ${alreadyCorrect}`)
    console.log(`   Total fixed: ${eurFixed + inrFixed}`)
    console.log('='.repeat(60))
    console.log('')

    if (eurFixed + inrFixed > 0) {
      console.log('✅ All EUR equivalents have been fixed!')
      console.log('   Insights and analytics should now show correct data.')
    } else {
      console.log('✅ All data was already correct!')
    }

  } catch (error) {
    console.error('❌ Error fixing EUR equivalents:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixEurEquivalents()
  .then(() => {
    console.log('\n✨ Fix completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fix failed:', error)
    process.exit(1)
  })
