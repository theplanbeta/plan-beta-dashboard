import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Sample lead data
const leadData = [
  { name: 'Rahul Sharma', whatsapp: '+919876543210', email: 'rahul.sharma@email.com', source: 'META_ADS', level: 'A1', batchCode: 'DEC24-A1-EVE' },
  { name: 'Priya Menon', whatsapp: '+919876543211', email: 'priya.menon@email.com', source: 'INSTAGRAM', level: 'A1', batchCode: 'DEC24-A1-MOR' },
  { name: 'Arjun Kumar', whatsapp: '+919876543212', email: 'arjun.kumar@email.com', source: 'GOOGLE', level: 'A2', batchCode: 'JAN25-A2-EVE' },
  { name: 'Sneha Pillai', whatsapp: '+919876543213', email: 'sneha.pillai@email.com', source: 'REFERRAL', level: 'A1', batchCode: 'DEC24-A1-EVE' },
  { name: 'Karthik Nair', whatsapp: '+919876543214', email: 'karthik.nair@email.com', source: 'ORGANIC', level: 'B1', batchCode: 'JAN25-B1-MOR' },
  { name: 'Anjali Das', whatsapp: '+919876543215', email: 'anjali.das@email.com', source: 'META_ADS', level: 'A2', batchCode: 'JAN25-A2-EVE' },
  { name: 'Vikram Reddy', whatsapp: '+919876543216', email: 'vikram.reddy@email.com', source: 'INSTAGRAM', level: 'A1', batchCode: 'DEC24-A1-MOR' },
  { name: 'Meera Krishna', whatsapp: '+919876543217', email: 'meera.krishna@email.com', source: 'GOOGLE', level: 'A1', batchCode: 'DEC24-A1-MOR' },
  { name: 'Rohan Varma', whatsapp: '+919876543218', email: 'rohan.varma@email.com', source: 'REFERRAL', level: 'B1', batchCode: 'JAN25-B1-MOR' },
  { name: 'Deepika Iyer', whatsapp: '+919876543219', email: 'deepika.iyer@email.com', source: 'ORGANIC', level: 'A2', batchCode: 'JAN25-A2-EVE' },
]

async function simulateMarketingFlow() {
  console.log('🚀 Starting Marketing Flow Simulation...\n')

  try {
    // Step 1: Create or get batches
    console.log('📋 Step 1: Setting up batches...')
    const batches = await Promise.all([
      prisma.batch.upsert({
        where: { batchCode: 'DEC24-A1-EVE' },
        update: {},
        create: {
          batchCode: 'DEC24-A1-EVE',
          level: 'A1',
          startDate: new Date('2024-12-15'),
          endDate: new Date('2025-02-28'),
          schedule: 'Mon, Wed, Fri 6:00 PM - 8:00 PM',
          totalSeats: 8,
          enrolledCount: 0,
          status: 'FILLING',
        },
      }),
      prisma.batch.upsert({
        where: { batchCode: 'DEC24-A1-MOR' },
        update: {},
        create: {
          batchCode: 'DEC24-A1-MOR',
          level: 'A1',
          startDate: new Date('2024-12-16'),
          endDate: new Date('2025-03-01'),
          schedule: 'Tue, Thu, Sat 9:00 AM - 11:00 AM',
          totalSeats: 8,
          enrolledCount: 0,
          status: 'FILLING',
        },
      }),
      prisma.batch.upsert({
        where: { batchCode: 'JAN25-A2-EVE' },
        update: {},
        create: {
          batchCode: 'JAN25-A2-EVE',
          level: 'A2',
          startDate: new Date('2025-01-10'),
          endDate: new Date('2025-03-25'),
          schedule: 'Mon, Wed, Fri 7:00 PM - 9:00 PM',
          totalSeats: 8,
          enrolledCount: 0,
          status: 'FILLING',
        },
      }),
      prisma.batch.upsert({
        where: { batchCode: 'JAN25-B1-MOR' },
        update: {},
        create: {
          batchCode: 'JAN25-B1-MOR',
          level: 'B1',
          startDate: new Date('2025-01-12'),
          endDate: new Date('2025-03-28'),
          schedule: 'Tue, Thu, Sat 10:00 AM - 12:00 PM',
          totalSeats: 6,
          enrolledCount: 0,
          status: 'FILLING',
        },
      }),
    ])
    console.log(`✅ Created/verified ${batches.length} batches\n`)

    // Step 2: Simulate complete flow for each lead
    for (let i = 0; i < leadData.length; i++) {
      const lead = leadData[i]
      console.log(`\n--- Lead ${i + 1}/10: ${lead.name} ---`)

      // 2a: Lead comes in
      console.log('  📞 New lead received...')
      const batch = batches.find((b) => b.batchCode === lead.batchCode)

      const createdLead = await prisma.lead.create({
        data: {
          name: lead.name,
          whatsapp: lead.whatsapp,
          email: lead.email,
          phone: lead.whatsapp,
          source: lead.source,
          status: 'NEW',
          quality: 'WARM',
          interestedLevel: lead.level,
          interestedBatch: batch ? { connect: { id: batch.id } } : undefined,
          firstContactDate: new Date(),
          contactAttempts: 0,
        },
      })
      console.log(`  ✅ Lead created: ${createdLead.name}`)

      // 2b: Marketing contacts, lead shows interest
      await new Promise((resolve) => setTimeout(resolve, 100))
      await prisma.lead.update({
        where: { id: createdLead.id },
        data: {
          status: 'CONTACTED',
          contactAttempts: 1,
          lastContactDate: new Date(),
          quality: 'HOT',
        },
      })
      console.log('  📱 Lead contacted - status: HOT')

      // 2c: Trial scheduled and attended
      await prisma.lead.update({
        where: { id: createdLead.id },
        data: {
          status: 'TRIAL_ATTENDED',
          contactAttempts: 2,
        },
      })
      console.log('  🎓 Trial attended')

      // 2d: Lead says YES - Create student
      console.log('  💚 Lead confirmed - Converting to student...')

      const pricing = {
        A1: { EUR: 134, INR: 14000 },
        A2: { EUR: 156, INR: 16000 },
        B1: { EUR: 172, INR: 18000 },
        B2: { EUR: 220, INR: 22000 },
      }

      const levelKey = lead.level as keyof typeof pricing
      const price = pricing[levelKey].INR
      const discount = Math.floor(Math.random() * 3) * 1000 // 0, 1000, or 2000 discount
      const finalPrice = price - discount
      const payableNow = Math.floor(finalPrice * 0.6) // 60% upfront
      const remaining = finalPrice - payableNow

      const student = await prisma.student.create({
        data: {
          studentId: `PB${new Date().getFullYear()}${String(i + 1).padStart(3, '0')}`,
          name: lead.name,
          whatsapp: lead.whatsapp,
          email: lead.email,
          enrollmentDate: new Date(),
          currentLevel: lead.level,
          enrollmentType: 'A1_ONLY',
          batch: batch ? { connect: { id: batch.id } } : undefined,
          originalPrice: price,
          discountApplied: discount,
          finalPrice,
          currency: 'INR',
          paymentStatus: 'PENDING',
          totalPaid: 0,
          balance: finalPrice,
          referralSource: lead.source,
          completionStatus: 'ACTIVE',
          churnRisk: 'LOW',
        },
      })
      console.log(`  🎓 Student created: ${student.studentId}`)

      // 2e: Marketing generates invoice
      console.log(`  📄 Invoice generated for ${student.name}`)
      console.log(`     💰 Total: ₹${finalPrice} | Payable Now: ₹${payableNow} | Remaining: ₹${remaining}`)

      // 2f: Payment received and confirmed
      await new Promise((resolve) => setTimeout(resolve, 100))
      const payment = await prisma.payment.create({
        data: {
          studentId: student.id,
          amount: payableNow,
          paymentDate: new Date(),
          method: Math.random() > 0.5 ? 'UPI' : 'BANK_TRANSFER',
          status: 'COMPLETED',
          currency: 'INR',
          transactionId: `TXN${Date.now()}${i}`,
          invoiceNumber: `INV-2024-${String(i + 1).padStart(3, '0')}`,
          invoiceSent: true,
        },
      })

      await prisma.student.update({
        where: { id: student.id },
        data: {
          totalPaid: payableNow,
          balance: remaining,
          paymentStatus: remaining > 0 ? 'PARTIAL' : 'PAID',
        },
      })
      console.log(`  💳 Payment confirmed: ₹${payableNow} (${payment.method})`)

      // 2g: Lead marked as converted, student added to batch
      await prisma.lead.update({
        where: { id: createdLead.id },
        data: {
          converted: true,
          convertedDate: new Date(),
          status: 'CONVERTED',
          convertedToStudent: { connect: { id: student.id } },
        },
      })

      if (batch) {
        await prisma.batch.update({
          where: { id: batch.id },
          data: {
            enrolledCount: { increment: 1 },
            fillRate: ((batch.enrolledCount + 1) / batch.totalSeats) * 100,
          },
        })
        console.log(`  📚 Student added to batch: ${batch.batchCode}`)
      }

      console.log(`  ✅ CONVERSION COMPLETE! ${lead.name} is now enrolled.`)
    }

    // Step 3: Summary
    console.log('\n\n📊 === SIMULATION SUMMARY ===')
    const totalLeads = await prisma.lead.count()
    const convertedLeads = await prisma.lead.count({ where: { converted: true } })
    const totalStudents = await prisma.student.count()
    const totalRevenue = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'COMPLETED' },
    })

    console.log(`\n📈 Metrics:`)
    console.log(`   Total Leads: ${totalLeads}`)
    console.log(`   Converted Leads: ${convertedLeads}`)
    console.log(`   Conversion Rate: ${((convertedLeads / totalLeads) * 100).toFixed(1)}%`)
    console.log(`   Total Students Enrolled: ${totalStudents}`)
    console.log(`   Total Revenue: ₹${totalRevenue._sum.amount || 0}`)

    console.log(`\n📚 Batches:`)
    const batchStats = await prisma.batch.findMany({
      select: {
        batchCode: true,
        level: true,
        enrolledCount: true,
        totalSeats: true,
        fillRate: true,
      },
    })

    batchStats.forEach((batch) => {
      console.log(
        `   ${batch.batchCode} (${batch.level}): ${batch.enrolledCount}/${batch.totalSeats} students (${batch.fillRate?.toFixed(0)}% full)`
      )
    })

    console.log('\n✅ Marketing flow simulation completed successfully!')
    console.log('\n🎯 Next Steps:')
    console.log('   1. Visit http://localhost:3000/dashboard/leads to see all leads')
    console.log('   2. Visit http://localhost:3000/dashboard/students to see enrolled students')
    console.log('   3. Click the 📄 icon to generate PDF/JPG invoices')
    console.log('   4. Visit http://localhost:3000/dashboard/batches to see batch enrollment\n')
  } catch (error) {
    console.error('❌ Error during simulation:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the simulation
simulateMarketingFlow()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
