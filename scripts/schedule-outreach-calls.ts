#!/usr/bin/env tsx
/**
 * Daily Outreach Call Scheduler
 *
 * Run this as a cron job daily at 6 AM to schedule calls for the next 7 days
 *
 * Crontab entry:
 * 0 6 * * * cd /path/to/plan-beta-dashboard && npx tsx scripts/schedule-outreach-calls.ts >> logs/outreach-scheduler.log 2>&1
 */

import { PrismaClient, OutreachPriority } from '@prisma/client';
import {
  scheduleDailyCalls,
  calculateStudentTier,
  isWeekend,
  getNextWeekday,
  type ScheduledCall
} from '../lib/outreach-scheduler';

const prisma = new PrismaClient();

interface DailySchedule {
  date: Date;
  calls: ScheduledCall[];
  priorityBreakdown: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  tierBreakdown: {
    PLATINUM: number;
    GOLD: number;
    SILVER: number;
    BRONZE: number;
  };
}

async function main() {
  console.log('========================================');
  console.log('DAILY OUTREACH CALL SCHEDULER');
  console.log(`Run at: ${new Date().toISOString()}`);
  console.log('========================================\n');

  const DAYS_TO_SCHEDULE = 7;
  const TARGET_CALLS_PER_DAY = 5;
  const CREATOR_USER_ID = 'system'; // Replace with actual founder user ID
  const CREATOR_NAME = 'Scheduling System';

  const schedules: DailySchedule[] = [];

  // Schedule for the next 7 days (skip weekends)
  let scheduledDays = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Reset to start of day

  while (scheduledDays < DAYS_TO_SCHEDULE) {
    currentDate.setDate(currentDate.getDate() + 1); // Move to next day

    // Skip weekends
    if (isWeekend(currentDate)) {
      console.log(`Skipping ${currentDate.toDateString()} (weekend)`);
      continue;
    }

    console.log(`\nScheduling for ${currentDate.toDateString()}...`);

    try {
      // Check if we already have scheduled calls for this date
      const existingCalls = await prisma.outreachCall.findMany({
        where: {
          scheduledDate: currentDate,
          status: { in: ['PENDING', 'SNOOZED'] }
        }
      });

      const remainingSlots = TARGET_CALLS_PER_DAY - existingCalls.length;

      if (remainingSlots <= 0) {
        console.log(`  ✓ Already have ${existingCalls.length} calls scheduled. Skipping.`);
        scheduledDays++;
        continue;
      }

      console.log(`  Existing calls: ${existingCalls.length}, Remaining slots: ${remainingSlots}`);

      // Generate schedule for this day
      const dailyCalls = await scheduleDailyCalls(new Date(currentDate), remainingSlots);

      if (dailyCalls.length === 0) {
        console.log('  ⚠ No eligible students found for scheduling');
        scheduledDays++;
        continue;
      }

      // Create OutreachCall records for each scheduled call
      let created = 0;
      for (const call of dailyCalls) {
        try {
          // Determine call type based on enrollment and reason
          const student = await prisma.student.findUnique({
            where: { id: call.studentId },
            select: { enrollmentDate: true }
          });

          if (!student) continue;

          const enrollmentDays = Math.floor(
            (Date.now() - new Date(student.enrollmentDate).getTime()) / (1000 * 60 * 60 * 24)
          );

          let callType: 'ONBOARDING' | 'CHECK_IN' | 'MILESTONE' | 'SUPPORT' | 'RETENTION' | 'FEEDBACK' | 'COMMUNITY' | 'OTHER' = 'CHECK_IN';

          if (enrollmentDays <= 21) {
            callType = 'ONBOARDING';
          } else if (call.reason.includes('churn') || call.reason.includes('absence')) {
            callType = 'RETENTION';
          } else if (call.reason.includes('payment')) {
            callType = 'SUPPORT';
          } else if (call.tier === 'PLATINUM' || call.tier === 'GOLD') {
            callType = 'COMMUNITY';
          }

          // Map priority to enum
          let priorityEnum: OutreachPriority;
          switch (call.priority) {
            case 'HIGH':
              priorityEnum = 'HIGH';
              break;
            case 'MEDIUM':
              priorityEnum = 'MEDIUM';
              break;
            case 'LOW':
              priorityEnum = 'LOW';
              break;
          }

          await prisma.outreachCall.create({
            data: {
              studentId: call.studentId,
              scheduledDate: currentDate,
              priority: priorityEnum,
              status: 'PENDING',
              callType,
              purpose: call.reason,
              preCallNotes: `Student Tier: ${call.tier}\\nAuto-scheduled by algorithm`,
              createdBy: CREATOR_USER_ID,
              createdByName: CREATOR_NAME
            }
          });

          created++;
        } catch (error) {
          console.error(`  ✗ Error scheduling call for ${call.studentName}:`, error);
        }
      }

      // Calculate breakdowns
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

      schedules.push({
        date: new Date(currentDate),
        calls: dailyCalls,
        priorityBreakdown,
        tierBreakdown
      });

      console.log(`  ✓ Scheduled ${created} calls`);
      console.log(`    Priority: HIGH=${priorityBreakdown.HIGH}, MEDIUM=${priorityBreakdown.MEDIUM}, LOW=${priorityBreakdown.LOW}`);
      console.log(`    Tiers: PLATINUM=${tierBreakdown.PLATINUM}, GOLD=${tierBreakdown.GOLD}, SILVER=${tierBreakdown.SILVER}, BRONZE=${tierBreakdown.BRONZE}`);

      scheduledDays++;
    } catch (error) {
      console.error(`  ✗ Error scheduling for ${currentDate.toDateString()}:`, error);
    }
  }

  // Print summary
  console.log('\n========================================');
  console.log('SCHEDULING SUMMARY');
  console.log('========================================');

  const totalCalls = schedules.reduce((sum, s) => sum + s.calls.length, 0);
  const totalHigh = schedules.reduce((sum, s) => sum + s.priorityBreakdown.HIGH, 0);
  const totalMedium = schedules.reduce((sum, s) => sum + s.priorityBreakdown.MEDIUM, 0);
  const totalLow = schedules.reduce((sum, s) => sum + s.priorityBreakdown.LOW, 0);

  console.log(`Total calls scheduled: ${totalCalls}`);
  console.log(`Days scheduled: ${schedules.length}`);
  console.log(`Average calls per day: ${(totalCalls / schedules.length).toFixed(1)}`);
  console.log('');
  console.log('Priority Distribution:');
  console.log(`  HIGH: ${totalHigh} (${((totalHigh / totalCalls) * 100).toFixed(1)}%)`);
  console.log(`  MEDIUM: ${totalMedium} (${((totalMedium / totalCalls) * 100).toFixed(1)}%)`);
  console.log(`  LOW: ${totalLow} (${((totalLow / totalCalls) * 100).toFixed(1)}%)`);

  // Detailed breakdown
  console.log('\n========================================');
  console.log('DAILY BREAKDOWN');
  console.log('========================================');

  for (const schedule of schedules) {
    console.log(`\\n${schedule.date.toDateString()}`);
    console.log(`Calls scheduled: ${schedule.calls.length}`);

    for (const call of schedule.calls) {
      console.log(`  [${call.priority}] ${call.studentName} (${call.tier})`);
      console.log(`      ${call.reason}`);
      console.log(`      WhatsApp: ${call.whatsapp}`);
    }
  }

  console.log('\\n========================================');
  console.log('SCHEDULER COMPLETED SUCCESSFULLY');
  console.log('========================================\\n');

  await prisma.$disconnect();
}

// Error handling
main()
  .catch((error) => {
    console.error('FATAL ERROR:', error);
    process.exit(1);
  });
