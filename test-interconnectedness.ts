import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n🔗 TESTING SYSTEM INTERCONNECTEDNESS')
  console.log('='.repeat(80))

  // Step 1: Get a HOT lead to convert
  console.log('\n1️⃣  STEP 1: Finding a HOT lead to convert...')
  const hotLead = await prisma.lead.findFirst({
    where: {
      quality: 'HOT',
      converted: false,
      status: { not: 'LOST' }
    },
    include: {
      interestedBatch: true,
      assignedTo: true,
    }
  })

  if (!hotLead) {
    console.error('❌ No unconverted HOT leads found')
    return
  }

  console.log(`✅ Found HOT lead: ${hotLead.name}`)
  console.log(`   Status: ${hotLead.status}`)
  console.log(`   Quality: ${hotLead.quality}`)
  console.log(`   Source: ${hotLead.source}`)
  console.log(`   Interested Batch: ${hotLead.interestedBatch?.batchCode || 'None'}`)
  console.log(`   Assigned to: ${hotLead.assignedTo?.name}`)

  // Step 2: Get batch with available seats
  console.log('\n2️⃣  STEP 2: Finding batch with available seats...')
  const availableBatch = await prisma.batch.findFirst({
    where: {
      enrolledCount: {
        lt: prisma.batch.fields.totalSeats
      },
      status: { in: ['FILLING', 'RUNNING', 'PLANNING'] }
    }
  })

  if (!availableBatch) {
    console.error('❌ No batches with available seats')
    return
  }

  console.log(`✅ Found batch: ${availableBatch.batchCode}`)
  console.log(`   Level: ${availableBatch.level}`)
  console.log(`   Capacity: ${availableBatch.enrolledCount}/${availableBatch.totalSeats}`)
  console.log(`   Status: ${availableBatch.status}`)

  // Step 3: Get current counts BEFORE conversion
  console.log('\n3️⃣  STEP 3: Recording current state...')
  const beforeState = {
    totalStudents: await prisma.student.count(),
    totalLeads: await prisma.lead.count(),
    convertedLeads: await prisma.lead.count({ where: { converted: true } }),
    batchEnrollment: availableBatch.enrolledCount,
    hotLeads: await prisma.lead.count({
      where: { quality: 'HOT', converted: false }
    }),
  }

  console.log(`✅ Current state:`)
  console.log(`   Total Students: ${beforeState.totalStudents}`)
  console.log(`   Total Leads: ${beforeState.totalLeads}`)
  console.log(`   Converted Leads: ${beforeState.convertedLeads}`)
  console.log(`   Hot Leads (unconverted): ${beforeState.hotLeads}`)
  console.log(`   Batch ${availableBatch.batchCode} enrollment: ${beforeState.batchEnrollment}`)

  // Step 4: Convert Lead to Student
  console.log('\n4️⃣  STEP 4: Converting lead to student...')

  const enrollmentType = 'A1_ONLY'
  const originalPrice = 8000
  const discountApplied = 500
  const finalPrice = originalPrice - discountApplied

  // Generate student ID
  const lastStudent = await prisma.student.findFirst({
    orderBy: { studentId: 'desc' }
  })
  const lastNumber = lastStudent ? parseInt(lastStudent.studentId.replace('STU', '')) : 0
  const newStudentId = `STU${String(lastNumber + 1).padStart(4, '0')}`

  const result = await prisma.$transaction(async (tx) => {
    // Create student
    const student = await tx.student.create({
      data: {
        studentId: newStudentId,
        name: hotLead.name,
        whatsapp: hotLead.whatsapp,
        email: hotLead.email,
        enrollmentDate: new Date(),
        currentLevel: availableBatch.level,
        enrollmentType,
        batchId: availableBatch.id,
        originalPrice,
        discountApplied,
        finalPrice,
        totalPaid: 0,
        balance: finalPrice,
        paymentStatus: 'PENDING',
        referralSource: hotLead.source,
        trialAttended: hotLead.trialAttendedDate !== null,
        trialDate: hotLead.trialAttendedDate,
      },
    })

    // Update lead as converted
    const updatedLead = await tx.lead.update({
      where: { id: hotLead.id },
      data: {
        converted: true,
        convertedDate: new Date(),
        studentId: student.id,
        status: 'CONVERTED',
      },
    })

    // Update batch enrollment
    const updatedBatch = await tx.batch.update({
      where: { id: availableBatch.id },
      data: {
        enrolledCount: { increment: 1 },
      },
    })

    return { student, lead: updatedLead, batch: updatedBatch }
  })

  console.log(`✅ Conversion successful!`)
  console.log(`   Created Student: ${result.student.studentId} - ${result.student.name}`)
  console.log(`   Enrollment Type: ${result.student.enrollmentType}`)
  console.log(`   Final Price: €${result.student.finalPrice}`)
  console.log(`   Payment Status: ${result.student.paymentStatus}`)
  console.log(`   Batch: ${availableBatch.batchCode}`)

  // Step 5: Verify interconnected updates
  console.log('\n5️⃣  STEP 5: Verifying interconnected updates...')

  // Check student was created
  const createdStudent = await prisma.student.findUnique({
    where: { id: result.student.id },
    include: {
      batch: true,
      convertedFromLead: true,
    }
  })

  console.log(`✅ Student verification:`)
  console.log(`   Student exists: ${createdStudent ? 'Yes' : 'No'}`)
  console.log(`   Linked to batch: ${createdStudent?.batch?.batchCode}`)
  console.log(`   Has lead reference: ${createdStudent?.convertedFromLead ? 'Yes' : 'No'}`)

  // Check lead was updated
  const updatedLead = await prisma.lead.findUnique({
    where: { id: hotLead.id },
    include: {
      convertedToStudent: true,
    }
  })

  console.log(`\n✅ Lead verification:`)
  console.log(`   Lead converted: ${updatedLead?.converted ? 'Yes' : 'No'}`)
  console.log(`   Status changed to: ${updatedLead?.status}`)
  console.log(`   Linked to student: ${updatedLead?.convertedToStudent?.studentId}`)
  console.log(`   Conversion date: ${updatedLead?.convertedDate?.toLocaleDateString()}`)

  // Check batch was updated
  const updatedBatch = await prisma.batch.findUnique({
    where: { id: availableBatch.id },
    include: {
      students: { select: { studentId: true, name: true } },
      leads: {
        where: { converted: false },
        select: { name: true, quality: true }
      }
    }
  })

  console.log(`\n✅ Batch verification:`)
  console.log(`   Enrollment count increased: ${beforeState.batchEnrollment} → ${updatedBatch?.enrolledCount}`)
  console.log(`   Total students in batch: ${updatedBatch?.students.length}`)
  console.log(`   New student in list: ${updatedBatch?.students.some(s => s.studentId === newStudentId) ? 'Yes' : 'No'}`)
  console.log(`   Unconverted leads still interested: ${updatedBatch?.leads.length}`)

  // Step 6: Check system-wide metrics
  console.log('\n6️⃣  STEP 6: Checking system-wide metrics...')

  const afterState = {
    totalStudents: await prisma.student.count(),
    totalLeads: await prisma.lead.count(),
    convertedLeads: await prisma.lead.count({ where: { converted: true } }),
    hotLeads: await prisma.lead.count({
      where: { quality: 'HOT', converted: false }
    }),
  }

  console.log(`✅ Metrics comparison:`)
  console.log(`   Total Students: ${beforeState.totalStudents} → ${afterState.totalStudents} (+${afterState.totalStudents - beforeState.totalStudents})`)
  console.log(`   Converted Leads: ${beforeState.convertedLeads} → ${afterState.convertedLeads} (+${afterState.convertedLeads - beforeState.convertedLeads})`)
  console.log(`   Hot Leads (unconverted): ${beforeState.hotLeads} → ${afterState.hotLeads} (-${beforeState.hotLeads - afterState.hotLeads})`)

  const conversionRate = (afterState.convertedLeads / afterState.totalLeads) * 100
  console.log(`   Conversion Rate: ${conversionRate.toFixed(1)}%`)

  // Step 7: Test cross-module relationships
  console.log('\n7️⃣  STEP 7: Testing cross-module relationships...')

  // Get student with all relationships
  const studentWithRelations = await prisma.student.findUnique({
    where: { id: result.student.id },
    include: {
      batch: {
        include: {
          teacher: true,
          leads: { where: { converted: false } }
        }
      },
      convertedFromLead: {
        include: {
          assignedTo: true,
        }
      },
      payments: true,
      attendance: true,
    }
  })

  console.log(`✅ Student relationships:`)
  console.log(`   → Batch: ${studentWithRelations?.batch?.batchCode}`)
  console.log(`   → Teacher: ${studentWithRelations?.batch?.teacher?.name || 'Unassigned'}`)
  console.log(`   → Original Lead: ${studentWithRelations?.convertedFromLead?.name}`)
  console.log(`   → Lead Source: ${studentWithRelations?.convertedFromLead?.source}`)
  console.log(`   → Lead assigned to: ${studentWithRelations?.convertedFromLead?.assignedTo?.name}`)
  console.log(`   → Payments: ${studentWithRelations?.payments.length}`)
  console.log(`   → Attendance records: ${studentWithRelations?.attendance.length}`)

  // Check if other leads are interested in the same batch
  console.log(`\n✅ Batch pipeline:`)
  console.log(`   Other unconverted leads interested in this batch: ${studentWithRelations?.batch?.leads.length}`)
  if (studentWithRelations?.batch?.leads && studentWithRelations.batch.leads.length > 0) {
    studentWithRelations.batch.leads.forEach((lead: { name: string; quality: string }) => {
      console.log(`     - ${lead.name} (${lead.quality})`)
    })
  }

  // Step 8: Verify Marketing dashboard would show updated data
  console.log('\n8️⃣  STEP 8: Simulating Marketing dashboard queries...')

  const dashboardData = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { quality: 'HOT', converted: false } }),
    prisma.lead.count({ where: { converted: true } }),
    prisma.student.count(),
    prisma.batch.findMany({
      where: { enrolledCount: { lt: prisma.batch.fields.totalSeats } }
    }),
  ])

  const [totalLeads, hotLeadsCount, convertedCount, totalStudents, availableBatches] = dashboardData
  const dashboardConversionRate = totalLeads > 0 ? (convertedCount / totalLeads) * 100 : 0
  const availableSeats = availableBatches.reduce((sum, b) => sum + (b.totalSeats - b.enrolledCount), 0)

  console.log(`✅ Marketing Dashboard Metrics:`)
  console.log(`   Total Leads: ${totalLeads}`)
  console.log(`   Hot Leads: ${hotLeadsCount}`)
  console.log(`   Converted: ${convertedCount}`)
  console.log(`   Conversion Rate: ${dashboardConversionRate.toFixed(1)}%`)
  console.log(`   Total Students: ${totalStudents}`)
  console.log(`   Available Seats: ${availableSeats}`)

  // Final Summary
  console.log('\n' + '='.repeat(80))
  console.log('📊 INTERCONNECTEDNESS TEST SUMMARY')
  console.log('='.repeat(80))

  const tests = [
    {
      name: 'Lead → Student conversion',
      passed: createdStudent !== null,
      details: `Student ${newStudentId} created from lead`
    },
    {
      name: 'Student → Batch relationship',
      passed: createdStudent?.batchId === availableBatch.id,
      details: `Student assigned to batch ${availableBatch.batchCode}`
    },
    {
      name: 'Batch enrollment auto-update',
      passed: updatedBatch?.enrolledCount === beforeState.batchEnrollment + 1,
      details: `Batch enrollment: ${beforeState.batchEnrollment} → ${updatedBatch?.enrolledCount}`
    },
    {
      name: 'Lead status auto-update',
      passed: updatedLead?.status === 'CONVERTED' && updatedLead?.converted === true,
      details: `Lead marked as CONVERTED`
    },
    {
      name: 'Bidirectional relationship',
      passed: updatedLead?.studentId === result.student.id && createdStudent?.convertedFromLead !== null,
      details: `Lead ↔ Student links verified`
    },
    {
      name: 'Marketing metrics update',
      passed: afterState.convertedLeads > beforeState.convertedLeads,
      details: `Conversion count increased`
    },
    {
      name: 'Hot leads count update',
      passed: afterState.hotLeads === beforeState.hotLeads - 1,
      details: `Hot leads reduced by 1`
    },
    {
      name: 'Student count increase',
      passed: afterState.totalStudents === beforeState.totalStudents + 1,
      details: `Student count: ${beforeState.totalStudents} → ${afterState.totalStudents}`
    },
    {
      name: 'Lead source tracking',
      passed: createdStudent?.referralSource === hotLead.source,
      details: `Source preserved: ${hotLead.source}`
    },
    {
      name: 'Trial attendance tracking',
      passed: createdStudent?.trialAttended === (hotLead.trialAttendedDate !== null),
      details: `Trial status preserved`
    },
  ]

  console.log('\n✅ Test Results:\n')
  let passedCount = 0
  tests.forEach((test, i) => {
    const icon = test.passed ? '✅' : '❌'
    console.log(`${icon} ${i + 1}. ${test.name}`)
    console.log(`   ${test.details}`)
    if (test.passed) passedCount++
  })

  console.log('\n' + '='.repeat(80))
  console.log(`📈 FINAL SCORE: ${passedCount}/${tests.length} tests passed (${((passedCount/tests.length)*100).toFixed(0)}%)`)
  console.log('='.repeat(80))

  if (passedCount === tests.length) {
    console.log('\n🎉 ALL INTERCONNECTEDNESS TESTS PASSED!')
    console.log('✅ The system correctly maintains relationships across:')
    console.log('   • Leads → Students (conversion)')
    console.log('   • Students → Batches (enrollment)')
    console.log('   • Batches → Leads (interest tracking)')
    console.log('   • Leads → Users (assignment)')
    console.log('   • Students → Payments (future)')
    console.log('   • Students → Attendance (future)')
    console.log('   • Metrics → Dashboard (real-time updates)')
  } else {
    console.log('\n⚠️  Some tests failed. Review the results above.')
  }

  console.log('\n✅ Test complete!\n')
}

main()
  .catch((e) => {
    console.error('❌ Test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
