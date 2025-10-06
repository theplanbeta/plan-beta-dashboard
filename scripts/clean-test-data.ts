import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanTestData() {
  console.log('🧹 Starting database cleanup...\n')

  try {
    // Delete in correct order due to foreign key constraints

    console.log('📝 Deleting payments...')
    const deletedPayments = await prisma.payment.deleteMany({})
    console.log(`   ✅ Deleted ${deletedPayments.count} payment records\n`)

    console.log('👥 Deleting students...')
    const deletedStudents = await prisma.student.deleteMany({})
    console.log(`   ✅ Deleted ${deletedStudents.count} student records\n`)

    console.log('📞 Deleting leads...')
    const deletedLeads = await prisma.lead.deleteMany({})
    console.log(`   ✅ Deleted ${deletedLeads.count} lead records\n`)

    console.log('📚 Deleting batches...')
    const deletedBatches = await prisma.batch.deleteMany({})
    console.log(`   ✅ Deleted ${deletedBatches.count} batch records\n`)

    // Verify cleanup
    console.log('🔍 Verifying cleanup...')
    const remainingPayments = await prisma.payment.count()
    const remainingStudents = await prisma.student.count()
    const remainingLeads = await prisma.lead.count()
    const remainingBatches = await prisma.batch.count()

    console.log(`   Payments: ${remainingPayments}`)
    console.log(`   Students: ${remainingStudents}`)
    console.log(`   Leads: ${remainingLeads}`)
    console.log(`   Batches: ${remainingBatches}\n`)

    if (remainingPayments === 0 && remainingStudents === 0 && remainingLeads === 0 && remainingBatches === 0) {
      console.log('✅ Database cleaned successfully! All test data removed.\n')
    } else {
      console.log('⚠️  Warning: Some records still remain.\n')
    }

    console.log('💡 Database is now ready for fresh data.')
    console.log('   Pricing configuration in lib/pricing.ts is untouched.\n')

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup
cleanTestData()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
