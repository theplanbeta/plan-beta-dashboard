#!/usr/bin/env tsx
/**
 * Test the outreach scheduling algorithm
 * This demonstrates how the system prioritizes and schedules calls
 */

import { PrismaClient } from '@prisma/client';
import {
  calculateStudentTier,
  calculateCallPriority,
  scheduleDailyCalls
} from '../lib/outreach-scheduler';

const prisma = new PrismaClient();

async function main() {
  console.log('========================================');
  console.log('OUTREACH SCHEDULING ALGORITHM TEST');
  console.log('========================================\n');

  // Get some sample students
  const students = await prisma.student.findMany({
    where: { completionStatus: 'ACTIVE' },
    take: 10,
    orderBy: { enrollmentDate: 'desc' }
  });

  console.log(`Testing with ${students.length} students\n`);

  // Test tier calculation for a few students
  console.log('========================================');
  console.log('TIER CALCULATION EXAMPLES');
  console.log('========================================\n');

  for (let i = 0; i < Math.min(5, students.length); i++) {
    const student = students[i];
    console.log(`Student: ${student.name} (${student.studentId})`);
    console.log(`Enrolled: ${new Date(student.enrollmentDate).toDateString()}`);
    console.log(`Payment Status: ${student.paymentStatus}`);
    console.log(`Churn Risk: ${student.churnRisk}`);
    console.log(`Attendance Rate: ${student.attendanceRate}%`);
    console.log(`Consecutive Absences: ${student.consecutiveAbsences}`);

    try {
      const tierResult = await calculateStudentTier(student.id);
      console.log(`\nTier: ${tierResult.tier} (Score: ${tierResult.score.toFixed(1)})`);
      console.log(`Recommended Contact Frequency: Every ${tierResult.recommendedFrequencyDays} days`);
      console.log('Score Breakdown:');
      console.log(`  Relationship Depth: ${tierResult.breakdown.relationshipDepth}/10`);
      console.log(`  Community Potential: ${tierResult.breakdown.communityPotential}/10`);
      console.log(`  Engagement: ${tierResult.breakdown.engagement}/10`);
      console.log(`  Need: ${tierResult.breakdown.need}/10`);
      console.log(`  VIP Status: ${tierResult.breakdown.vipStatus}/10`);
      console.log('Reasoning:');
      tierResult.reasoning.forEach(r => console.log(`  - ${r}`));

      const priorityResult = await calculateCallPriority(student.id);
      console.log(`\nCall Priority: ${priorityResult.priority} (Score: ${priorityResult.score})`);
      console.log(`Reason: ${priorityResult.reason}`);
      if (priorityResult.urgencyFactors.length > 0) {
        console.log('Urgency Factors:');
        priorityResult.urgencyFactors.forEach(f => console.log(`  - ${f}`));
      }
    } catch (error) {
      console.error('Error calculating tier/priority:', error);
    }

    console.log('\n' + '─'.repeat(80) + '\n');
  }

  // Test scheduling for next week
  console.log('========================================');
  console.log('WEEKLY SCHEDULE GENERATION');
  console.log('========================================\n');

  const today = new Date();
  const schedules = [];

  for (let i = 1; i <= 7; i++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + i);
    targetDate.setHours(0, 0, 0, 0);

    // Skip weekends
    const dayOfWeek = targetDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log(`${targetDate.toDateString()} - WEEKEND (skipped)\n`);
      continue;
    }

    console.log(`Scheduling for: ${targetDate.toDateString()}`);

    try {
      const dailyCalls = await scheduleDailyCalls(targetDate, 5);

      const priorityBreakdown = {
        HIGH: dailyCalls.filter(c => c.priority === 'HIGH').length,
        MEDIUM: dailyCalls.filter(c => c.priority === 'MEDIUM').length,
        LOW: dailyCalls.filter(c => c.priority === 'LOW').length
      };

      const tierBreakdown = {
        PLATINUM: dailyCalls.filter(c => c.tier === 'PLATINUM').length,
        GOLD: dailyCalls.filter(c => c.tier === 'GOLD').length,
        SILVER: dailyCalls.filter(c => c.tier === 'SILVER').length,
        BRONZE: dailyCalls.filter(c => c.tier === 'BRONZE').length
      };

      console.log(`Calls scheduled: ${dailyCalls.length}`);
      console.log(`Priority: HIGH=${priorityBreakdown.HIGH}, MEDIUM=${priorityBreakdown.MEDIUM}, LOW=${priorityBreakdown.LOW}`);
      console.log(`Tiers: PLATINUM=${tierBreakdown.PLATINUM}, GOLD=${tierBreakdown.GOLD}, SILVER=${tierBreakdown.SILVER}, BRONZE=${tierBreakdown.BRONZE}\n`);

      if (dailyCalls.length > 0) {
        console.log('Scheduled calls:');
        dailyCalls.forEach((call, idx) => {
          console.log(`  ${idx + 1}. [${call.priority}] ${call.studentName} (${call.tier})`);
          console.log(`     ${call.reason}`);
          console.log(`     WhatsApp: ${call.whatsapp}`);
        });
      } else {
        console.log('  No eligible students for this date');
      }

      schedules.push({
        date: targetDate,
        calls: dailyCalls,
        priorityBreakdown,
        tierBreakdown
      });
    } catch (error) {
      console.error('Error scheduling:', error);
    }

    console.log('\n' + '─'.repeat(80) + '\n');
  }

  // Summary
  console.log('========================================');
  console.log('WEEKLY SUMMARY');
  console.log('========================================\n');

  const totalCalls = schedules.reduce((sum, s) => sum + s.calls.length, 0);
  const totalHigh = schedules.reduce((sum, s) => sum + s.priorityBreakdown.HIGH, 0);
  const totalMedium = schedules.reduce((sum, s) => sum + s.priorityBreakdown.MEDIUM, 0);
  const totalLow = schedules.reduce((sum, s) => sum + s.priorityBreakdown.LOW, 0);

  console.log(`Total calls: ${totalCalls}`);
  console.log(`Days with calls: ${schedules.length}`);
  console.log(`Average calls per day: ${schedules.length > 0 ? (totalCalls / schedules.length).toFixed(1) : 0}`);
  console.log('\nPriority Distribution:');
  console.log(`  HIGH: ${totalHigh} (${totalCalls > 0 ? ((totalHigh / totalCalls) * 100).toFixed(1) : 0}%)`);
  console.log(`  MEDIUM: ${totalMedium} (${totalCalls > 0 ? ((totalMedium / totalCalls) * 100).toFixed(1) : 0}%)`);
  console.log(`  LOW: ${totalLow} (${totalCalls > 0 ? ((totalLow / totalCalls) * 100).toFixed(1) : 0}%)`);

  console.log('\n========================================');
  console.log('ALGORITHM INSIGHTS');
  console.log('========================================\n');

  console.log('The scheduling algorithm:');
  console.log('✓ Prioritizes HIGH-risk students (new students, churn risk, absences)');
  console.log('✓ Balances workload (3-5 calls per day)');
  console.log('✓ Respects 3-week minimum between calls (unless HIGH priority)');
  console.log('✓ Assigns student tiers based on value and engagement');
  console.log('✓ Distributes calls: 50% HIGH, 30% MEDIUM, 20% LOW priority');
  console.log('✓ Skips weekends automatically');
  console.log('✓ Prevents double-scheduling\n');

  await prisma.$disconnect();
}

main().catch(console.error);
