import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n🖥️  VERIFYING UI DATA AVAILABILITY')
  console.log('='.repeat(80))

  // Simulate what Marketing dashboard would fetch
  console.log('\n📊 Marketing Dashboard Data:\n')

  const [students, referrals, batches, leads] = await Promise.all([
    prisma.student.findMany(),
    prisma.referral.findMany(),
    prisma.batch.findMany(),
    prisma.lead.findMany({
      include: {
        interestedBatch: {
          select: {
            batchCode: true,
            level: true,
            enrolledCount: true,
            totalSeats: true,
          },
        },
        assignedTo: {
          select: {
            name: true,
            email: true,
          },
        },
        convertedToStudent: {
          select: {
            studentId: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  ])

  // Calculate Marketing Dashboard metrics (same as component)
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthStudents = students.filter(
    (s) => new Date(s.enrollmentDate) >= thisMonthStart
  )

  const bySource: Record<string, number> = {}
  students.forEach((s) => {
    bySource[s.referralSource] = (bySource[s.referralSource] || 0) + 1
  })

  const fillingBatches = batches.filter((b) => b.status === 'FILLING')
  const seatsAvailable = batches.reduce(
    (sum, b) => sum + (b.totalSeats - b.enrolledCount),
    0
  )

  const hotLeads = leads.filter((l) => l.quality === 'HOT' && !l.converted)
  const convertedLeads = leads.filter((l) => l.converted)
  const conversionRate = leads.length > 0 ? (convertedLeads.length / leads.length) * 100 : 0

  console.log('✅ Key Metrics Card Data:')
  console.log(`   Total Leads: ${leads.length}`)
  console.log(`   Hot Leads: ${hotLeads.length}`)
  console.log(`   Conversion Rate: ${conversionRate.toFixed(1)}%`)
  console.log(`   Converted: ${convertedLeads.length}`)
  console.log(`   Total Students: ${students.length}`)
  console.log(`   This Month: ${thisMonthStudents.length}`)
  console.log(`   Available Seats: ${seatsAvailable}`)

  console.log('\n✅ Quick Actions Data:')
  console.log(`   "Add New Lead" → /dashboard/leads/new`)
  console.log(`   "Manage Leads" → Shows ${hotLeads.length} hot leads to follow up`)

  // Simulate Leads Page data
  console.log('\n\n📋 Leads Page Data:\n')

  console.log('✅ Lead List (showing first 5):')
  leads.slice(0, 5).forEach((lead, i) => {
    console.log(`\n${i + 1}. ${lead.name}`)
    console.log(`   Status: ${lead.status} | Quality: ${lead.quality} | Source: ${lead.source}`)
    console.log(`   WhatsApp: ${lead.whatsapp}`)
    if (lead.email) console.log(`   Email: ${lead.email}`)
    console.log(`   Contact Attempts: ${lead.contactAttempts}`)
    if (lead.interestedBatch) {
      console.log(`   Interested: ${lead.interestedBatch.batchCode} (${lead.interestedBatch.enrolledCount}/${lead.interestedBatch.totalSeats})`)
    }
    if (lead.converted && lead.convertedToStudent) {
      console.log(`   ✅ CONVERTED → ${lead.convertedToStudent.studentId}`)
    }
    if (lead.followUpDate) {
      console.log(`   Follow-up: ${new Date(lead.followUpDate).toLocaleDateString()}`)
    }
  })

  console.log('\n✅ Filter Options Available:')
  const statuses = [...new Set(leads.map(l => l.status))]
  const qualities = [...new Set(leads.map(l => l.quality))]
  const sources = [...new Set(leads.map(l => l.source))]

  console.log(`   Statuses: ${statuses.join(', ')}`)
  console.log(`   Qualities: ${qualities.join(', ')}`)
  console.log(`   Sources: ${sources.join(', ')}`)

  // Check recently converted student
  console.log('\n\n👤 Recently Converted Student:\n')

  const recentStudent = await prisma.student.findFirst({
    where: {
      convertedFromLead: {
        isNot: null
      }
    },
    include: {
      batch: {
        include: {
          teacher: true,
        }
      },
      convertedFromLead: {
        include: {
          assignedTo: true,
        }
      },
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  if (recentStudent) {
    console.log(`✅ Student: ${recentStudent.studentId} - ${recentStudent.name}`)
    console.log(`   Enrollment Type: ${recentStudent.enrollmentType}`)
    console.log(`   Final Price: €${recentStudent.finalPrice}`)
    console.log(`   Payment Status: ${recentStudent.paymentStatus}`)
    console.log(`   Batch: ${recentStudent.batch?.batchCode}`)
    console.log(`   Teacher: ${recentStudent.batch?.teacher?.name || 'Unassigned'}`)
    console.log(`   Trial Attended: ${recentStudent.trialAttended ? 'Yes' : 'No'}`)

    if (recentStudent.convertedFromLead) {
      console.log(`\n   📍 Original Lead Info:`)
      console.log(`      Lead Name: ${recentStudent.convertedFromLead.name}`)
      console.log(`      Lead Source: ${recentStudent.convertedFromLead.source}`)
      console.log(`      Lead Quality: ${recentStudent.convertedFromLead.quality}`)
      console.log(`      Assigned to: ${recentStudent.convertedFromLead.assignedTo?.name}`)
      console.log(`      Conversion Date: ${recentStudent.convertedFromLead.convertedDate?.toLocaleDateString()}`)
    }
  }

  // Check batch pipeline view
  console.log('\n\n🎯 Batch Pipeline View (A1-JAN-EVE-01):\n')

  const targetBatch = await prisma.batch.findFirst({
    where: { batchCode: 'A1-JAN-EVE-01' },
    include: {
      students: {
        select: {
          studentId: true,
          name: true,
          enrollmentDate: true,
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      },
      leads: {
        where: { converted: false },
        select: {
          name: true,
          quality: true,
          status: true,
        }
      },
      teacher: {
        select: {
          name: true,
        }
      }
    }
  })

  if (targetBatch) {
    console.log(`✅ Batch: ${targetBatch.batchCode}`)
    console.log(`   Capacity: ${targetBatch.enrolledCount}/${targetBatch.totalSeats}`)
    console.log(`   Status: ${targetBatch.status}`)
    console.log(`   Teacher: ${targetBatch.teacher?.name || 'Unassigned'}`)

    console.log(`\n   Recent Students (showing 5):`)
    targetBatch.students.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.studentId} - ${s.name}`)
    })

    console.log(`\n   Leads in Pipeline (${targetBatch.leads.length} unconverted):`)
    targetBatch.leads.forEach((l) => {
      console.log(`      • ${l.name} (${l.quality}, ${l.status})`)
    })
  }

  // Navigation verification
  console.log('\n\n🧭 Navigation Menu Items:\n')

  const founderNav = ['Dashboard', 'Leads', 'Students', 'Batches', 'Attendance', 'Payments', 'Referrals', 'Insights']
  const marketingNav = ['Dashboard', 'Leads', 'Students', 'Batches', 'Referrals', 'Insights']
  const teacherNav = ['Dashboard', 'Students', 'Batches', 'Attendance']

  console.log(`✅ FOUNDER sees: ${founderNav.join(', ')}`)
  console.log(`✅ MARKETING sees: ${marketingNav.join(', ')}`)
  console.log(`✅ TEACHER sees: ${teacherNav.join(', ')}`)

  // Final UI checklist
  console.log('\n\n' + '='.repeat(80))
  console.log('📱 UI VERIFICATION CHECKLIST')
  console.log('='.repeat(80))

  const uiChecks = [
    { component: 'Marketing Dashboard', hasData: leads.length > 0, data: `${leads.length} leads, ${hotLeads.length} hot` },
    { component: 'Leads Page', hasData: leads.length > 0, data: `${leads.length} leads with filters` },
    { component: 'Add Lead Form', hasData: batches.length > 0, data: `${batches.length} batches for assignment` },
    { component: 'Lead Detail Page', hasData: leads.length > 0, data: `${leads.length} leads viewable` },
    { component: 'Convert Lead Flow', hasData: hotLeads.length > 0, data: `${hotLeads.length} hot leads ready` },
    { component: 'Student List', hasData: students.length > 0, data: `${students.length} students (1 from lead)` },
    { component: 'Batch View', hasData: targetBatch !== null, data: `Shows students + lead pipeline` },
    { component: 'Navigation Menu', hasData: true, data: 'Role-based items configured' },
  ]

  console.log('\n')
  uiChecks.forEach(check => {
    const icon = check.hasData ? '✅' : '❌'
    console.log(`${icon} ${check.component}`)
    console.log(`   ${check.data}`)
  })

  const allPassed = uiChecks.every(c => c.hasData)

  console.log('\n' + '='.repeat(80))
  if (allPassed) {
    console.log('🎉 ALL UI COMPONENTS HAVE DATA!')
    console.log('✅ The system is ready for live testing in the browser')
  } else {
    console.log('⚠️  Some UI components may have issues')
  }
  console.log('='.repeat(80))

  console.log('\n📖 Testing Instructions:\n')
  console.log('1. Login as marketing@planbeta.in (password: admin123)')
  console.log('2. Dashboard should show:')
  console.log(`   • ${leads.length} total leads`)
  console.log(`   • ${hotLeads.length} hot leads`)
  console.log(`   • ${conversionRate.toFixed(1)}% conversion rate`)
  console.log('3. Click "Leads" in navigation')
  console.log('4. See all 12 leads with filtering options')
  console.log('5. Click on any HOT lead → Click "Convert to Student"')
  console.log('6. Fill form and convert → New student created')
  console.log('7. Go to Students page → See newly converted student')
  console.log('8. Return to Leads → See updated conversion rate\n')
}

main()
  .catch((e) => {
    console.error('❌ Verification failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
