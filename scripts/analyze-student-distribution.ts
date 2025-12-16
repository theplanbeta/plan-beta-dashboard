import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeStudents() {
  const students = await prisma.student.findMany({
    include: {
      interactions: {
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      payments: true,
      attendance: {
        orderBy: { date: 'desc' },
        take: 5
      },
      referralsGiven: true,
      contentPosts: true,
    }
  });

  console.log('=== STUDENT DISTRIBUTION ANALYSIS ===\n');
  console.log('Total Students:', students.length);

  console.log('\nBy Payment Status:');
  console.log('  PAID:', students.filter(s => s.paymentStatus === 'PAID').length);
  console.log('  PARTIAL:', students.filter(s => s.paymentStatus === 'PARTIAL').length);
  console.log('  OVERDUE:', students.filter(s => s.paymentStatus === 'OVERDUE').length);
  console.log('  PENDING:', students.filter(s => s.paymentStatus === 'PENDING').length);

  console.log('\nBy Churn Risk:');
  console.log('  LOW:', students.filter(s => s.churnRisk === 'LOW').length);
  console.log('  MEDIUM:', students.filter(s => s.churnRisk === 'MEDIUM').length);
  console.log('  HIGH:', students.filter(s => s.churnRisk === 'HIGH').length);

  console.log('\nBy Completion Status:');
  console.log('  ACTIVE:', students.filter(s => s.completionStatus === 'ACTIVE').length);
  console.log('  DROPPED:', students.filter(s => s.completionStatus === 'DROPPED').length);
  console.log('  COMPLETED:', students.filter(s => s.completionStatus === 'COMPLETED').length);
  console.log('  ON_HOLD:', students.filter(s => s.completionStatus === 'ON_HOLD').length);
  console.log('  SUSPENDED:', students.filter(s => s.completionStatus === 'SUSPENDED').length);

  const now = new Date();
  const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  console.log('\nInteraction & Engagement Analysis:');
  console.log('  Students with interactions:', students.filter(s => s.interactions.length > 0).length);
  console.log('  Never contacted:', students.filter(s => s.interactions.length === 0).length);
  console.log('  New students (< 3 weeks):', students.filter(s => new Date(s.enrollmentDate) > threeWeeksAgo).length);
  console.log('  Students with 3+ consecutive absences:', students.filter(s => s.consecutiveAbsences >= 3).length);
  console.log('  Students with referrals given:', students.filter(s => s.referralsGiven.length > 0).length);
  console.log('  Students with content posts:', students.filter(s => s.contentPosts.length > 0).length);

  console.log('\nAttendance Analysis:');
  console.log('  High attendance (>80%):', students.filter(s => s.attendanceRate > 80).length);
  console.log('  Medium attendance (50-80%):', students.filter(s => s.attendanceRate >= 50 && s.attendanceRate <= 80).length);
  console.log('  Low attendance (<50%):', students.filter(s => s.attendanceRate < 50 && s.attendanceRate > 0).length);
  console.log('  No attendance data:', students.filter(s => s.attendanceRate === 0).length);

  console.log('\nLast Contact Analysis (Active Students):');
  const activeStudents = students.filter(s => s.completionStatus === 'ACTIVE');
  const lastContactedRecently = activeStudents.filter(s => {
    if (s.interactions.length === 0) return false;
    const lastInteraction = new Date(s.interactions[0].createdAt);
    return lastInteraction > twoMonthsAgo;
  });
  const lastContactedLongAgo = activeStudents.filter(s => {
    if (s.interactions.length === 0) return true;
    const lastInteraction = new Date(s.interactions[0].createdAt);
    return lastInteraction <= twoMonthsAgo && lastInteraction > threeMonthsAgo;
  });
  const neverContacted = activeStudents.filter(s => s.interactions.length === 0);

  console.log('  Contacted in last 2 months:', lastContactedRecently.length);
  console.log('  Last contact 2-3 months ago:', lastContactedLongAgo.length);
  console.log('  Never contacted:', neverContacted.length);

  await prisma.$disconnect();
}

analyzeStudents().catch(console.error);
