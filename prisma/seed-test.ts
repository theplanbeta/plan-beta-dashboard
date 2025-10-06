import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed with 50 students...')

  // Create users
  const hashedPassword = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@planbeta.in' },
    update: {},
    create: {
      email: 'admin@planbeta.in',
      name: 'Admin User',
      password: hashedPassword,
      role: 'FOUNDER',
    },
  })

  const teacher1 = await prisma.user.upsert({
    where: { email: 'teacher1@planbeta.in' },
    update: {},
    create: {
      email: 'teacher1@planbeta.in',
      name: 'Sarah Schmidt',
      password: hashedPassword,
      role: 'TEACHER',
    },
  })

  const teacher2 = await prisma.user.upsert({
    where: { email: 'teacher2@planbeta.in' },
    update: {},
    create: {
      email: 'teacher2@planbeta.in',
      name: 'Michael Weber',
      password: hashedPassword,
      role: 'TEACHER',
    },
  })

  const marketing = await prisma.user.upsert({
    where: { email: 'marketing@planbeta.in' },
    update: {},
    create: {
      email: 'marketing@planbeta.in',
      name: 'Sree - Red Collage',
      password: hashedPassword,
      role: 'MARKETING',
    },
  })

  console.log('✅ Created 4 users (1 founder, 2 teachers, 1 marketing - Red Collage)')

  // Create 5 batches with teacher assignments
  const batches = []
  const batchConfigs = [
    { code: 'A1-JAN-EVE-01', level: 'A1', seats: 12, status: 'RUNNING', teacherId: teacher1.id },
    { code: 'A1-JAN-MOR-01', level: 'A1', seats: 10, status: 'RUNNING', teacherId: teacher1.id },
    { code: 'A2-FEB-EVE-01', level: 'A2', seats: 12, status: 'RUNNING', teacherId: teacher2.id },
    { code: 'B1-FEB-MOR-01', level: 'B1', seats: 8, status: 'FILLING', teacherId: teacher2.id },
    { code: 'B2-MAR-EVE-01', level: 'B2', seats: 8, status: 'PLANNING', teacherId: null },
  ]

  for (const config of batchConfigs) {
    const batch = await prisma.batch.create({
      data: {
        batchCode: config.code,
        level: config.level,
        totalSeats: config.seats,
        enrolledCount: 0,
        status: config.status as any,
        revenueTarget: 10000,
        teacherCost: 2000,
        teacherId: config.teacherId,
        startDate: new Date(2025, 0, 15),
        endDate: new Date(2025, 3, 15),
        schedule: 'Mon/Wed/Fri 6:00 PM - 8:00 PM',
      },
    })
    batches.push(batch)
  }
  console.log(`✅ Created ${batches.length} batches`)

  // Create 50 students with varied scenarios
  const students = []
  const studentTemplates = [
    { namePrefix: 'Student', count: 50 },
  ]

  let studentIndex = 1
  const enrollmentDates = [
    new Date(2025, 0, 5),   // 10 students - 3 months ago
    new Date(2025, 0, 20),  // 10 students - 2.5 months ago
    new Date(2025, 1, 1),   // 10 students - 2 months ago
    new Date(2025, 1, 15),  // 10 students - 1.5 months ago
    new Date(2025, 2, 1),   // 10 students - 1 month ago
  ]

  for (let i = 0; i < 50; i++) {
    const batchIndex = i % batches.length
    const enrollmentDate = enrollmentDates[Math.floor(i / 10)]

    // Vary student statuses and payment situations
    const scenarios = [
      // Scenario 1: Good students (30%)
      { paymentStatus: 'PAID', completionStatus: 'ACTIVE', attendanceRate: 85, churnRisk: 'LOW' },
      // Scenario 2: Students with pending payment (25%)
      { paymentStatus: 'PARTIAL', completionStatus: 'ACTIVE', attendanceRate: 70, churnRisk: 'MEDIUM' },
      // Scenario 3: Overdue students (20%)
      { paymentStatus: 'OVERDUE', completionStatus: 'ACTIVE', attendanceRate: 55, churnRisk: 'HIGH' },
      // Scenario 4: Low attendance (15%)
      { paymentStatus: 'PAID', completionStatus: 'ACTIVE', attendanceRate: 45, churnRisk: 'HIGH' },
      // Scenario 5: Dropped students (10%)
      { paymentStatus: 'OVERDUE', completionStatus: 'DROPPED', attendanceRate: 30, churnRisk: 'HIGH' },
    ]

    const scenarioIndex = i % 10 < 3 ? 0 : i % 10 < 5 ? 1 : i % 10 < 7 ? 2 : i % 10 < 9 ? 3 : 4
    const scenario = scenarios[scenarioIndex]

    const originalPrice = 8000
    const discount = i % 5 === 0 ? 500 : 0
    const finalPrice = originalPrice - discount
    const totalPaid = scenario.paymentStatus === 'PAID' ? finalPrice :
                     scenario.paymentStatus === 'PARTIAL' ? finalPrice * 0.6 :
                     finalPrice * 0.3
    const balance = finalPrice - totalPaid

    const student = await prisma.student.create({
      data: {
        studentId: `STU${String(studentIndex).padStart(4, '0')}`,
        name: `Student ${studentIndex}`,
        whatsapp: `+49${1500000000 + studentIndex}`,
        email: `student${studentIndex}@test.com`,
        enrollmentDate,
        enrollmentType: i % 4 === 0 ? 'A1_ONLY' : i % 4 === 1 ? 'FOUNDATION_A1_A2' : i % 4 === 2 ? 'CAREER_A1_A2_B1' : 'COMPLETE_PATHWAY',
        referralSource: i % 5 === 0 ? 'META_ADS' : i % 5 === 1 ? 'INSTAGRAM' : i % 5 === 2 ? 'GOOGLE' : i % 5 === 3 ? 'REFERRAL' : 'ORGANIC',
        currentLevel: batches[batchIndex].level as any,
        batchId: batches[batchIndex].id,
        originalPrice,
        discountApplied: discount,
        finalPrice,
        totalPaid,
        balance,
        paymentStatus: scenario.paymentStatus as any,
        completionStatus: scenario.completionStatus as any,
        attendanceRate: scenario.attendanceRate,
        classesAttended: Math.floor(scenario.attendanceRate * 0.3),
        totalClasses: 30,
        churnRisk: scenario.churnRisk as any,
        trialAttended: true,
        emailNotifications: true,
        emailWelcome: true,
        emailPayment: true,
        emailAttendance: true,
        emailBatch: true,
        emailReferral: true,
      },
    })
    students.push(student)
    studentIndex++
  }
  console.log(`✅ Created ${students.length} students`)

  // Update batch enrolled counts
  for (const batch of batches) {
    const count = await prisma.student.count({ where: { batchId: batch.id } })
    await prisma.batch.update({
      where: { id: batch.id },
      data: { enrolledCount: count },
    })
  }
  console.log('✅ Updated batch enrollment counts')

  // Create payments for students
  let paymentCount = 0
  for (const student of students) {
    if (student.totalPaid > 0) {
      // Create 1-3 payment records
      const numPayments = student.paymentStatus === 'PAID' ? 2 : 1
      const amountPerPayment = student.totalPaid / numPayments

      for (let p = 0; p < numPayments; p++) {
        await prisma.payment.create({
          data: {
            studentId: student.id,
            amount: amountPerPayment,
            method: p % 3 === 0 ? 'BANK_TRANSFER' : p % 3 === 1 ? 'CASH' : 'UPI',
            status: 'COMPLETED',
            paymentDate: new Date(student.enrollmentDate.getTime() + p * 30 * 24 * 60 * 60 * 1000),
            transactionId: `TXN${Date.now()}${p}`,
          },
        })
        paymentCount++
      }
    }
  }
  console.log(`✅ Created ${paymentCount} payment records`)

  // Create attendance records (last 30 days)
  let attendanceCount = 0
  const today = new Date()
  for (const student of students) {
    if (student.completionStatus === 'DROPPED') continue

    // Create 30 attendance records
    for (let day = 0; day < 30; day++) {
      const attendanceDate = new Date(today.getTime() - day * 24 * 60 * 60 * 1000)
      const random = Math.random() * 100

      let status: string
      if (random < student.attendanceRate) {
        status = random < student.attendanceRate * 0.9 ? 'PRESENT' : 'LATE'
      } else {
        status = random < student.attendanceRate + 10 ? 'ABSENT' : 'EXCUSED'
      }

      await prisma.attendance.create({
        data: {
          studentId: student.id,
          date: attendanceDate,
          status: status as any,
        },
      })
      attendanceCount++
    }
  }
  console.log(`✅ Created ${attendanceCount} attendance records`)

  // Create referrals (10 students referred by 5 students)
  const referrers = students.slice(0, 5)
  const referees = students.slice(45, 50)
  let referralCount = 0

  for (let i = 0; i < 5; i++) {
    await prisma.referral.create({
      data: {
        referrerId: referrers[i].id,
        refereeId: referees[i].id,
        referralDate: new Date(2025, 1, 1),
        enrollmentDate: referees[i].enrollmentDate,
        month1Complete: true,
        payoutStatus: 'PENDING',
        payoutAmount: 2000,
      },
    })
    referralCount++
  }
  console.log(`✅ Created ${referralCount} referrals`)

  // Print summary statistics
  console.log('\n📊 DATABASE SUMMARY:')
  console.log('==================')

  const stats = {
    totalStudents: await prisma.student.count(),
    activeStudents: await prisma.student.count({ where: { completionStatus: 'ACTIVE' } }),
    droppedStudents: await prisma.student.count({ where: { completionStatus: 'DROPPED' } }),
    paidStudents: await prisma.student.count({ where: { paymentStatus: 'PAID' } }),
    overdueStudents: await prisma.student.count({ where: { paymentStatus: 'OVERDUE' } }),
    totalBatches: await prisma.batch.count(),
    runningBatches: await prisma.batch.count({ where: { status: 'RUNNING' } }),
    totalPayments: await prisma.payment.count(),
    totalRevenue: await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'COMPLETED' },
    }),
    totalAttendance: await prisma.attendance.count(),
    avgAttendanceRate: await prisma.student.aggregate({ _avg: { attendanceRate: true } }),
    highChurnRisk: await prisma.student.count({ where: { churnRisk: 'HIGH' } }),
  }

  console.log(`Total Students: ${stats.totalStudents}`)
  console.log(`Active: ${stats.activeStudents} | Dropped: ${stats.droppedStudents}`)
  console.log(`Paid: ${stats.paidStudents} | Overdue: ${stats.overdueStudents}`)
  console.log(`Total Batches: ${stats.totalBatches} (Running: ${stats.runningBatches})`)
  console.log(`Total Payments: ${stats.totalPayments}`)
  console.log(`Total Revenue: €${stats.totalRevenue._sum.amount}`)
  console.log(`Attendance Records: ${stats.totalAttendance}`)
  console.log(`Avg Attendance Rate: ${stats.avgAttendanceRate._avg.attendanceRate?.toFixed(1)}%`)
  console.log(`High Churn Risk: ${stats.highChurnRisk} students`)
  console.log('\n✅ Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
