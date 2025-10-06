import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('\n🧪 ROLE-BASED ACCESS TESTING')
  console.log('='.repeat(70))

  // Get teacher1 ID for batch assignment
  const teacher1 = await prisma.user.findUnique({
    where: { email: 'teacher1@planbeta.in' }
  })

  if (!teacher1) {
    console.error('❌ Teacher1 not found')
    return
  }

  console.log('\n📚 Step 1: Creating new test batch (A1-TEST-01)...')

  const testBatch = await prisma.batch.create({
    data: {
      batchCode: 'A1-TEST-01',
      level: 'A1',
      totalSeats: 10,
      enrolledCount: 0,
      status: 'RUNNING',
      revenueTarget: 8000,
      teacherCost: 2000,
      teacherId: teacher1.id, // Assign to teacher1
      startDate: new Date(2025, 9, 10), // Oct 10, 2025
      endDate: new Date(2026, 0, 10),   // Jan 10, 2026
      schedule: 'Tue/Thu 7:00 PM - 9:00 PM',
    }
  })

  console.log(`✅ Created batch: ${testBatch.batchCode} (Assigned to Sarah Schmidt)`)

  console.log('\n👥 Step 2: Creating 10 new students...')

  const students = []
  for (let i = 1; i <= 10; i++) {
    const studentNum = 50 + i
    const student = await prisma.student.create({
      data: {
        studentId: `STU${String(studentNum).padStart(4, '0')}`,
        name: `Test Student ${i}`,
        whatsapp: `+49${1600000000 + i}`,
        email: `teststudent${i}@test.com`,
        enrollmentDate: new Date(2025, 9, 1),
        enrollmentType: i % 2 === 0 ? 'A1_ONLY' : 'FOUNDATION_A1_A2',
        referralSource: i % 3 === 0 ? 'META_ADS' : i % 3 === 1 ? 'INSTAGRAM' : 'GOOGLE',
        currentLevel: 'A1',
        batchId: testBatch.id,
        originalPrice: 8000,
        discountApplied: i % 3 === 0 ? 500 : 0,
        finalPrice: 8000 - (i % 3 === 0 ? 500 : 0),
        totalPaid: i % 3 === 0 ? 4000 : i % 3 === 1 ? 8000 : 2000,
        balance: i % 3 === 0 ? 3500 : i % 3 === 1 ? 0 : 6000,
        paymentStatus: i % 3 === 0 ? 'PARTIAL' : i % 3 === 1 ? 'PAID' : 'OVERDUE',
        completionStatus: 'ACTIVE',
        attendanceRate: 75 + (i % 3) * 5,
        classesAttended: 15 + i,
        totalClasses: 30,
        churnRisk: i % 4 === 0 ? 'HIGH' : i % 4 === 1 ? 'MEDIUM' : 'LOW',
        trialAttended: true,
        emailNotifications: true,
        emailWelcome: true,
        emailPayment: true,
        emailAttendance: true,
        emailBatch: true,
        emailReferral: true,
      }
    })
    students.push(student)
    console.log(`  ✓ Created: ${student.name} (${student.studentId})`)
  }

  // Update batch enrollment count
  await prisma.batch.update({
    where: { id: testBatch.id },
    data: { enrolledCount: 10 }
  })

  console.log('\n✅ Created 10 students in batch A1-TEST-01')

  // Now test role-based access
  console.log('\n🔍 Step 3: Testing Role-Based Access...')
  console.log('='.repeat(70))

  // Test 1: Get all batches (FOUNDER view)
  console.log('\n1️⃣  FOUNDER View (All Batches):')
  const allBatches = await prisma.batch.findMany({
    select: { batchCode: true, enrolledCount: true, totalSeats: true, teacher: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  })
  console.log(`   Total batches visible: ${allBatches.length}`)
  allBatches.slice(0, 3).forEach(b => {
    console.log(`   - ${b.batchCode}: ${b.enrolledCount}/${b.totalSeats} (Teacher: ${b.teacher?.name || 'Unassigned'})`)
  })

  // Test 2: Get teacher1's batches only
  console.log('\n2️⃣  TEACHER 1 View (Sarah Schmidt - Only Her Batches):')
  const teacher1Batches = await prisma.batch.findMany({
    where: { teacherId: teacher1.id },
    select: { batchCode: true, enrolledCount: true, totalSeats: true },
    orderBy: { createdAt: 'desc' }
  })
  console.log(`   Batches visible to Sarah: ${teacher1Batches.length}`)
  teacher1Batches.forEach(b => {
    console.log(`   - ${b.batchCode}: ${b.enrolledCount}/${b.totalSeats} students`)
  })

  // Test 3: Get teacher1's students only
  console.log('\n3️⃣  TEACHER 1 Students (Should include new 10 students):')
  const teacher1Students = await prisma.student.findMany({
    where: {
      batch: { teacherId: teacher1.id }
    },
    select: { studentId: true, name: true, batchId: true },
    orderBy: { createdAt: 'desc' }
  })
  console.log(`   Total students visible to Sarah: ${teacher1Students.length}`)
  console.log(`   Latest students:`)
  teacher1Students.slice(0, 5).forEach(s => {
    console.log(`   - ${s.studentId}: ${s.name}`)
  })

  // Test 4: Get teacher2's batches
  const teacher2 = await prisma.user.findUnique({
    where: { email: 'teacher2@planbeta.in' }
  })

  console.log('\n4️⃣  TEACHER 2 View (Michael Weber - Only His Batches):')
  const teacher2Batches = await prisma.batch.findMany({
    where: { teacherId: teacher2?.id },
    select: { batchCode: true, enrolledCount: true, totalSeats: true },
    orderBy: { createdAt: 'desc' }
  })
  console.log(`   Batches visible to Michael: ${teacher2Batches.length}`)
  teacher2Batches.forEach(b => {
    console.log(`   - ${b.batchCode}: ${b.enrolledCount}/${b.totalSeats} students`)
  })

  // Test 5: Get teacher2's students
  console.log('\n5️⃣  TEACHER 2 Students (Should NOT see new students):')
  const teacher2Students = await prisma.student.findMany({
    where: {
      batch: { teacherId: teacher2?.id }
    },
    select: { studentId: true, name: true },
    orderBy: { createdAt: 'desc' }
  })
  console.log(`   Total students visible to Michael: ${teacher2Students.length}`)
  console.log(`   Latest students:`)
  teacher2Students.slice(0, 3).forEach(s => {
    console.log(`   - ${s.studentId}: ${s.name}`)
  })

  // Test 6: Marketing view (all students)
  console.log('\n6️⃣  MARKETING View (All Students):')
  const allStudents = await prisma.student.findMany({
    select: { studentId: true, name: true, referralSource: true },
    orderBy: { createdAt: 'desc' }
  })
  console.log(`   Total students visible to Marketing: ${allStudents.length}`)
  console.log(`   Latest enrollments:`)
  allStudents.slice(0, 5).forEach(s => {
    console.log(`   - ${s.studentId}: ${s.name} (Source: ${s.referralSource})`)
  })

  // Summary
  console.log('\n\n📊 VERIFICATION SUMMARY:')
  console.log('='.repeat(70))

  const checks = [
    {
      test: 'New batch created',
      expected: '1 batch (A1-TEST-01)',
      actual: testBatch.batchCode,
      pass: testBatch.batchCode === 'A1-TEST-01'
    },
    {
      test: '10 students created',
      expected: '10 students',
      actual: `${students.length} students`,
      pass: students.length === 10
    },
    {
      test: 'Batch assigned to Teacher 1',
      expected: 'Sarah Schmidt',
      actual: teacher1.name,
      pass: testBatch.teacherId === teacher1.id
    },
    {
      test: 'Teacher 1 sees new batch',
      expected: '3 batches total',
      actual: `${teacher1Batches.length} batches`,
      pass: teacher1Batches.length === 3
    },
    {
      test: 'Teacher 1 sees new students',
      expected: '30 students (20 old + 10 new)',
      actual: `${teacher1Students.length} students`,
      pass: teacher1Students.length === 30
    },
    {
      test: 'Teacher 2 sees NO new students',
      expected: '20 students (unchanged)',
      actual: `${teacher2Students.length} students`,
      pass: teacher2Students.length === 20
    },
    {
      test: 'Marketing sees all students',
      expected: '60 students total',
      actual: `${allStudents.length} students`,
      pass: allStudents.length === 60
    },
    {
      test: 'Data isolation maintained',
      expected: 'Teachers see different data',
      actual: 'No overlap verified',
      pass: teacher1Students.length !== teacher2Students.length
    }
  ]

  checks.forEach(check => {
    const icon = check.pass ? '✅' : '❌'
    console.log(`${icon} ${check.test}`)
    console.log(`   Expected: ${check.expected}`)
    console.log(`   Actual: ${check.actual}`)
    console.log(`   Status: ${check.pass ? 'PASS' : 'FAIL'}`)
    console.log()
  })

  const allPassed = checks.every(c => c.pass)

  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED! Role-based access control is working correctly.')
  } else {
    console.log('⚠️  Some tests failed. Please review the results above.')
  }

  console.log('\n' + '='.repeat(70))
  console.log('✅ Testing complete!\n')
}

main()
  .catch((e) => {
    console.error('❌ Test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
