import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n📊 SEEDING LEAD DATA')
  console.log('='.repeat(70))

  // Get marketing user for assignment
  const marketingUser = await prisma.user.findUnique({
    where: { email: 'marketing@planbeta.in' }
  })

  if (!marketingUser) {
    console.error('❌ Marketing user not found')
    return
  }

  // Get available batches
  const batches = await prisma.batch.findMany({
    where: {
      status: { in: ['FILLING', 'PLANNING', 'RUNNING'] }
    },
    take: 3
  })

  console.log('\n✅ Found marketing user:', marketingUser.name)
  console.log('✅ Found', batches.length, 'batches for assignment')

  // Lead configurations
  const leadConfigs = [
    // HOT LEADS (High quality, advanced in pipeline)
    {
      name: 'Anna Weber',
      whatsapp: '+49 160 1234501',
      email: 'anna.weber@email.de',
      phone: '+49 30 12345001',
      source: 'META_ADS',
      status: 'TRIAL_ATTENDED',
      quality: 'HOT',
      interestedLevel: 'A1',
      interestedType: 'FOUNDATION_A1_A2',
      batchId: batches[0]?.id,
      contactAttempts: 3,
      trialAttendedDate: new Date(2025, 9, 3),
      notes: 'Very interested, ready to enroll. Trial class went excellent.',
    },
    {
      name: 'Thomas Müller',
      whatsapp: '+49 160 1234502',
      email: 'thomas.mueller@email.de',
      source: 'GOOGLE',
      status: 'TRIAL_SCHEDULED',
      quality: 'HOT',
      interestedLevel: 'A1',
      interestedType: 'CAREER_A1_A2_B1',
      batchId: batches[0]?.id,
      contactAttempts: 2,
      trialScheduledDate: new Date(2025, 9, 8),
      followUpDate: new Date(2025, 9, 7),
      notes: 'Engineer looking to relocate to Germany. Very motivated.',
    },
    {
      name: 'Sarah Schmidt',
      whatsapp: '+49 160 1234503',
      email: 'sarah.schmidt@email.de',
      source: 'INSTAGRAM',
      status: 'INTERESTED',
      quality: 'HOT',
      interestedLevel: 'A1',
      interestedType: 'COMPLETE_PATHWAY',
      batchId: batches[0]?.id,
      contactAttempts: 2,
      followUpDate: new Date(2025, 9, 6),
      notes: 'Wants to study medicine in Germany. Needs complete pathway.',
    },

    // WARM LEADS (Medium quality, in progress)
    {
      name: 'Michael Fischer',
      whatsapp: '+49 160 1234504',
      email: 'michael.fischer@email.de',
      source: 'META_ADS',
      status: 'CONTACTED',
      quality: 'WARM',
      interestedLevel: 'A1',
      interestedType: 'A1_ONLY',
      batchId: batches[1]?.id,
      contactAttempts: 1,
      lastContactDate: new Date(2025, 9, 2),
      followUpDate: new Date(2025, 9, 6),
      notes: 'Interested but wants to compare with other institutes.',
    },
    {
      name: 'Laura Becker',
      whatsapp: '+49 160 1234505',
      email: null,
      source: 'REFERRAL',
      status: 'CONTACTED',
      quality: 'WARM',
      interestedLevel: 'A2',
      batchId: batches[1]?.id,
      contactAttempts: 1,
      lastContactDate: new Date(2025, 9, 1),
      followUpDate: new Date(2025, 9, 7),
      notes: 'Referred by existing student. Has A1 certificate.',
    },
    {
      name: 'David Wagner',
      whatsapp: '+49 160 1234506',
      email: 'david.wagner@email.de',
      source: 'GOOGLE',
      status: 'INTERESTED',
      quality: 'WARM',
      interestedLevel: 'A1',
      interestedType: 'FOUNDATION_A1_A2',
      contactAttempts: 2,
      followUpDate: new Date(2025, 9, 8),
      notes: 'Interested in evening batch. Works full-time.',
    },
    {
      name: 'Julia Hoffmann',
      whatsapp: '+49 160 1234507',
      email: 'julia.hoffmann@email.de',
      source: 'INSTAGRAM',
      status: 'TRIAL_SCHEDULED',
      quality: 'WARM',
      interestedLevel: 'A1',
      interestedType: 'A1_ONLY',
      batchId: batches[0]?.id,
      contactAttempts: 2,
      trialScheduledDate: new Date(2025, 9, 9),
      followUpDate: new Date(2025, 9, 8),
      notes: 'Student, wants to try one level first.',
    },

    // COLD LEADS (Early stage, minimal engagement)
    {
      name: 'Martin Schulz',
      whatsapp: '+49 160 1234508',
      email: null,
      source: 'META_ADS',
      status: 'NEW',
      quality: 'COLD',
      contactAttempts: 0,
      notes: 'Just submitted inquiry form. Need to make first contact.',
    },
    {
      name: 'Christina Meyer',
      whatsapp: '+49 160 1234509',
      email: 'christina.meyer@email.de',
      source: 'ORGANIC',
      status: 'CONTACTED',
      quality: 'COLD',
      interestedLevel: 'A1',
      contactAttempts: 1,
      lastContactDate: new Date(2025, 8, 28),
      followUpDate: new Date(2025, 9, 10),
      notes: 'Not sure about timing. Asked to follow up next week.',
    },
    {
      name: 'Alexander Koch',
      whatsapp: '+49 160 1234510',
      email: null,
      source: 'OTHER',
      status: 'NEW',
      quality: 'COLD',
      contactAttempts: 0,
      notes: 'Walk-in inquiry. Left contact info.',
    },

    // CONVERTED LEAD (For testing conversion flow)
    {
      name: 'Emma Richter',
      whatsapp: '+49 160 1234511',
      email: 'emma.richter@email.de',
      source: 'META_ADS',
      status: 'CONVERTED',
      quality: 'HOT',
      interestedLevel: 'A1',
      interestedType: 'A1_ONLY',
      batchId: batches[0]?.id,
      contactAttempts: 3,
      converted: true,
      convertedDate: new Date(2025, 9, 1),
      trialAttendedDate: new Date(2025, 8, 30),
      notes: 'Successfully converted to student. Trial class was excellent.',
    },

    // LOST LEAD (For realistic data)
    {
      name: 'Felix Zimmermann',
      whatsapp: '+49 160 1234512',
      email: 'felix.zimmermann@email.de',
      source: 'INSTAGRAM',
      status: 'LOST',
      quality: 'WARM',
      interestedLevel: 'A1',
      contactAttempts: 4,
      lastContactDate: new Date(2025, 8, 25),
      notes: 'Decided to go with another institute due to timing.',
    },
  ]

  console.log('\n📋 Creating', leadConfigs.length, 'sample leads...\n')

  const createdLeads = []
  for (const config of leadConfigs) {
    const lead = await prisma.lead.create({
      data: {
        ...config,
        assignedToId: marketingUser.id,
      }
    })
    createdLeads.push(lead)

    const statusIcon =
      lead.quality === 'HOT' ? '🔥' :
      lead.quality === 'WARM' ? '🌤️' : '❄️'

    console.log(`  ${statusIcon} Created: ${lead.name} (${lead.status}, ${lead.quality})`)
  }

  console.log('\n✅ Created', createdLeads.length, 'leads successfully!')

  // Summary
  const summary = {
    total: createdLeads.length,
    hot: createdLeads.filter(l => l.quality === 'HOT').length,
    warm: createdLeads.filter(l => l.quality === 'WARM').length,
    cold: createdLeads.filter(l => l.quality === 'COLD').length,
    converted: createdLeads.filter(l => l.converted).length,
    lost: createdLeads.filter(l => l.status === 'LOST').length,
    active: createdLeads.filter(l => !l.converted && l.status !== 'LOST').length,
  }

  console.log('\n📊 SUMMARY:')
  console.log('='.repeat(70))
  console.log(`Total Leads: ${summary.total}`)
  console.log(`  🔥 Hot: ${summary.hot}`)
  console.log(`  🌤️  Warm: ${summary.warm}`)
  console.log(`  ❄️  Cold: ${summary.cold}`)
  console.log(`  ✅ Converted: ${summary.converted}`)
  console.log(`  ❌ Lost: ${summary.lost}`)
  console.log(`  🎯 Active: ${summary.active}`)
  console.log(`  📈 Conversion Rate: ${summary.total > 0 ? ((summary.converted / summary.total) * 100).toFixed(1) : 0}%`)

  console.log('\n' + '='.repeat(70))
  console.log('✅ Lead seeding complete!')
  console.log('\nNext steps:')
  console.log('1. Login as marketing@planbeta.in')
  console.log('2. Visit /dashboard/leads to see all leads')
  console.log('3. Try converting a HOT lead to student')
  console.log('4. Check Marketing dashboard for updated metrics\n')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
